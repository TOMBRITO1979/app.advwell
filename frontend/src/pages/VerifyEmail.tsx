import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Link de verificação inválido. Token não encontrado.');
        return;
      }

      try {
        const response = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(response.data.message || 'Email verificado com sucesso!');
        toast.success('Email verificado! Você já pode fazer login.');

        // Redireciona para login após 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        const errorMessage = error.response?.data?.message ||
                            error.response?.data?.error ||
                            'Erro ao verificar email. O link pode ter expirado.';
        setMessage(errorMessage);
        toast.error(errorMessage);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verificação de Email
            </h1>
            <p className="text-gray-600">
              {status === 'loading' && 'Verificando seu email...'}
              {status === 'success' && 'Email verificado com sucesso!'}
              {status === 'error' && 'Erro na verificação'}
            </p>
          </div>

          {/* Status Icon and Message */}
          <div className="text-center mb-6">
            {status === 'loading' && (
              <div className="flex flex-col items-center">
                <Loader className="w-16 h-16 text-green-600 animate-spin mb-4" />
                <p className="text-gray-600">
                  Aguarde enquanto verificamos seu email...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center">
                <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                <p className="text-gray-800 font-medium mb-2">{message}</p>
                <p className="text-sm text-gray-600">
                  Redirecionando para a página de login...
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center">
                <XCircle className="w-16 h-16 text-red-600 mb-4" />
                <p className="text-gray-800 font-medium mb-4">{message}</p>
                <div className="space-y-3 w-full">
                  <button
                    onClick={() => navigate('/resend-verification')}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Solicitar Novo Link
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Voltar para Login
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {status === 'success' && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600">
                Bem-vindo ao <span className="font-semibold text-green-600">AdvWell</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
