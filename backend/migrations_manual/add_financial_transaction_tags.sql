-- Migration: Add financial_transaction_tags table
-- Date: 2026-01-23
-- Description: Create junction table for FinancialTransaction <-> Tag relationship

-- Create financial_transaction_tags table (same pattern as case_tags, client_tags, etc.)
CREATE TABLE IF NOT EXISTS financial_transaction_tags (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_transaction_id VARCHAR(36) NOT NULL,
    tag_id VARCHAR(36) NOT NULL,
    company_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_financial_transaction_tags_transaction
        FOREIGN KEY (financial_transaction_id)
        REFERENCES financial_transactions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_financial_transaction_tags_tag
        FOREIGN KEY (tag_id)
        REFERENCES tags(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_financial_transaction_tags_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    -- Unique constraint (same transaction can't have same tag twice)
    CONSTRAINT uq_financial_transaction_tag UNIQUE (financial_transaction_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_transaction_tags_company ON financial_transaction_tags(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_transaction_tags_transaction ON financial_transaction_tags(financial_transaction_id);
CREATE INDEX IF NOT EXISTS idx_financial_transaction_tags_tag ON financial_transaction_tags(tag_id);
