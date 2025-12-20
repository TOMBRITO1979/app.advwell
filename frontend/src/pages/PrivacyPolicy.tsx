import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Shield, FileText, Clock, Users, Database, Lock, Mail, AlertTriangle } from 'lucide-react';

interface PolicyContent {
  title: string;
  version: string;
  lastUpdated: string;
  content: string;
}

const PrivacyPolicy: React.FC = () => {
  const [policy, setPolicy] = useState<PolicyContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await api.get('/lgpd/privacy-policy');
        setPolicy(response.data);
      } catch (error) {
        console.error('Error fetching privacy policy:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-100 via-green-200 to-teal-200">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-green-200 to-teal-200 relative overflow-hidden">
      {/* Animated background geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-300/30 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/4 -right-24 w-96 h-96 bg-green-300/25 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] bg-teal-200/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNkb3RzKSIvPjwvc3ZnPg==')] opacity-40"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/login"
            className="inline-flex items-center text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-xl bg-white/90 rounded-3xl shadow-2xl border border-white/40 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-10 text-white">
              <div className="flex items-center mb-4">
                <Shield className="w-12 h-12 mr-4" />
                <div>
                  <h1 className="text-3xl font-bold">{policy?.title || 'Politica de Privacidade'}</h1>
                  <p className="text-white/80 mt-1">
                    Versao {policy?.version || '1.0'} - Atualizada em {policy?.lastUpdated || new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="bg-primary-50 px-8 py-4 border-b border-primary-100">
              <p className="text-sm text-primary-700 font-medium mb-2">Navegacao Rapida:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: Database, label: 'Dados Coletados', href: '#dados-coletados' },
                  { icon: FileText, label: 'Finalidades', href: '#finalidades' },
                  { icon: Users, label: 'Compartilhamento', href: '#compartilhamento' },
                  { icon: Lock, label: 'Seguranca', href: '#seguranca' },
                  { icon: Clock, label: 'Retencao', href: '#retencao' },
                  { icon: Mail, label: 'Contato', href: '#contato' },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center px-3 py-1.5 bg-white rounded-full text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <item.icon className="w-3.5 h-3.5 mr-1.5" />
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Policy Content */}
            <div className="px-8 py-8">
              {policy?.content ? (
                <div
                  className="prose prose-primary max-w-none
                    prose-headings:text-neutral-800 prose-headings:font-bold
                    prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-primary-100
                    prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                    prose-p:text-neutral-600 prose-p:leading-relaxed
                    prose-li:text-neutral-600
                    prose-strong:text-neutral-800
                    prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: policy.content }}
                />
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 text-warning-500 mx-auto mb-4" />
                  <p className="text-neutral-600">Politica de privacidade nao disponivel no momento.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-neutral-50 px-8 py-6 border-t border-neutral-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-neutral-500">
                  Documento em conformidade com a Lei Geral de Protecao de Dados (LGPD) - Lei n. 13.709/2018
                </p>
                <Link
                  to="/termos-de-uso"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Ver Termos de Uso
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
