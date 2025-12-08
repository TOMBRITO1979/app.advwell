import Queue from 'bull';
import nodemailer from 'nodemailer';
import prisma from '../utils/prisma';
import { decrypt } from '../utils/encryption';
import { replaceTemplateVariables } from '../utils/email-templates';

// Queue configuration
const emailQueue = new Queue('email-campaign', {
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Process individual email sending
emailQueue.process('send-email', 10, async (job) => {
  const { recipientId, campaignId, companyId } = job.data;

  try {
    // Fetch recipient and campaign data
    const recipient = await prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
      include: {
        campaign: {
          include: {
            company: {
              include: {
                smtpConfig: true,
              },
            },
          },
        },
      },
    });

    if (!recipient || !recipient.campaign.company.smtpConfig) {
      throw new Error('Recipient or SMTP config not found');
    }

    const campaign = recipient.campaign;
    const smtp = campaign.company.smtpConfig!;

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: decrypt(smtp.password),
      },
    });

    // Replace template variables
    const variables = {
      nome_cliente: recipient.recipientName || recipient.recipientEmail,
      nome_empresa: campaign.company.name,
      data: new Date().getFullYear().toString(),
    };

    const personalizedSubject = replaceTemplateVariables(campaign.subject, variables);
    const personalizedBody = replaceTemplateVariables(campaign.body, variables);

    // Send email
    await transporter.sendMail({
      from: `${smtp.fromName || campaign.company.name} <${smtp.fromEmail}>`,
      to: recipient.recipientEmail,
      subject: personalizedSubject,
      html: personalizedBody,
    });

    // Update recipient as sent
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return {
      success: true,
      email: recipient.recipientEmail,
    };
  } catch (error: any) {
    // Update recipient as failed
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'failed',
        errorMessage: error.message || 'Unknown error',
      },
    });

    throw error; // Re-throw to trigger retry
  }
});

// Process campaign completion check
emailQueue.process('check-campaign-completion', async (job) => {
  const { campaignId } = job.data;

  try {
    // Count recipients by status
    const [sentCount, failedCount, pendingCount] = await Promise.all([
      prisma.campaignRecipient.count({
        where: { campaignId, status: 'sent' },
      }),
      prisma.campaignRecipient.count({
        where: { campaignId, status: 'failed' },
      }),
      prisma.campaignRecipient.count({
        where: { campaignId, status: 'pending' },
      }),
    ]);

    // If no more pending, mark campaign as completed
    if (pendingCount === 0) {
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'completed',
          sentCount,
          failedCount,
          sentAt: new Date(),
        },
      });

      console.log(`✅ Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);
    }

    return {
      success: true,
      sentCount,
      failedCount,
      pendingCount,
    };
  } catch (error: any) {
    console.error('Error checking campaign completion:', error);
    throw error;
  }
});

// Event handlers
emailQueue.on('completed', (job, result) => {
  if (job.name === 'send-email' && result.success) {
    console.log(`✓ Email sent: ${result.email}`);
  }
});

emailQueue.on('failed', (job, err) => {
  console.error(`✗ Email job failed: ${job.name} - ${err.message}`);
});

// Helper function to enqueue campaign emails
export const enqueueCampaignEmails = async (campaignId: string) => {
  try {
    // Get all pending recipients
    const recipients = await prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        status: 'pending',
      },
      select: {
        id: true,
        recipientEmail: true,
        campaign: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (recipients.length === 0) {
      console.log('No pending recipients for campaign:', campaignId);
      return { enqueued: 0 };
    }

    const companyId = recipients[0].campaign.companyId;

    // Enqueue each email with a small delay
    const jobs = recipients.map((recipient, index) =>
      emailQueue.add(
        'send-email',
        {
          recipientId: recipient.id,
          campaignId,
          companyId,
        },
        {
          jobId: `email-${recipient.id}-${Date.now()}`,
          delay: index * 200, // 200ms delay between each (5 emails/second max)
        }
      )
    );

    await Promise.all(jobs);

    // Schedule completion check after all emails should be processed
    const estimatedTime = recipients.length * 500 + 10000; // 500ms per email + 10s buffer
    await emailQueue.add(
      'check-campaign-completion',
      { campaignId },
      {
        jobId: `check-${campaignId}-${Date.now()}`,
        delay: estimatedTime,
      }
    );

    console.log(`📧 Enqueued ${recipients.length} emails for campaign ${campaignId}`);

    return {
      enqueued: recipients.length,
      estimatedCompletionTime: estimatedTime,
    };
  } catch (error: any) {
    console.error('Error enqueueing campaign emails:', error);
    throw error;
  }
};

// Get queue statistics
export const getEmailQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
};

export default emailQueue;
