// Página de Login
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Layers, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useLogin } from '../api/hooks';
import { useToast } from '../contexts/ToastContext';

const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória').min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const loginMutation = useLogin();

  useEffect(() => {
    if (localStorage.getItem('auth_token')) navigate('/', { replace: true });
  }, [navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginForm) {
    try {
      await loginMutation.mutateAsync(data);
      showToast('Login realizado com sucesso!', 'success');
      navigate('/', { replace: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao fazer login', 'error');
    }
  }

  const pending = isSubmitting || loginMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0f1e' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2563EB, #00D4FF)' }}
          >
            <Layers size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Claude Code Ecosystem
          </h1>
          <p className="text-[#94a3b8] text-sm">Entre na sua conta para continuar</p>
        </div>

        <div className="rounded-2xl border border-[#1e293b] p-8" style={{ background: '#0f172a' }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[#e2e8f0]">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                <input
                  id="email" type="email" autoComplete="email" {...register('email')}
                  placeholder="seu@email.com"
                  className={`w-full pl-9 pr-4 py-2.5 bg-[#0a0f1e] border rounded-lg text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none transition-colors ${
                    errors.email ? 'border-red-500/60 focus:border-red-500' : 'border-[#1e293b] focus:border-blue-500/60'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="flex items-center gap-1.5 text-xs text-red-400"><AlertCircle size={12} />{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[#e2e8f0]">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                <input
                  id="password" type="password" autoComplete="current-password" {...register('password')}
                  placeholder="••••••••"
                  className={`w-full pl-9 pr-4 py-2.5 bg-[#0a0f1e] border rounded-lg text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none transition-colors ${
                    errors.password ? 'border-red-500/60 focus:border-red-500' : 'border-[#1e293b] focus:border-blue-500/60'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="flex items-center gap-1.5 text-xs text-red-400"><AlertCircle size={12} />{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit" disabled={pending}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: pending ? '#1d4ed8' : 'linear-gradient(135deg, #2563EB, #00D4FF)' }}
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              {pending ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-[#94a3b8] mt-6">
            Não tem conta?{' '}
            <Link to="/register" className="text-blue-400 hover:text-cyan-400 font-medium transition-colors">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
