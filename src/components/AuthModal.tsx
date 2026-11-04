import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff, X } from 'lucide-react'
import { FaFacebookF, FaGoogle } from 'react-icons/fa'
import { useAuth } from '../lib/auth'
import { messageFromError } from '../lib/api'

type AuthMode = 'login' | 'register'

export function AuthModal({ mode }: { mode: AuthMode }) {
    const { login, register } = useAuth()
    const navigate = useNavigate()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [pending, setPending] = useState(false)

    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                void navigate({ to: '/' })
            }
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [navigate])

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError('')
        if (mode === 'register' && password !== confirmPassword) {
            setError('As senhas não coincidem.')
            return
        }
        setPending(true)

        try {
            if (mode === 'login') {
                await login(email, password)
            } else {
                await register(name, email, password)
            }

            const target =
                sessionStorage.getItem('jungle-resume-path') || '/profile'

            sessionStorage.removeItem('jungle-resume-path')

            if (target === '/checkout') {
                await navigate({ to: '/checkout', replace: true })
            } else if (target === '/favorites') {
                await navigate({ to: '/favorites', replace: true })
            } else if (target === '/wallets') {
                await navigate({ to: '/wallets', replace: true })
            } else if (target.startsWith('/order/')) {
                await navigate({
                    to: '/order/$id',
                    params: { id: target.slice('/order/'.length) },
                    replace: true,
                })
            } else {
                await navigate({ to: '/profile', replace: true })
            }
        } catch (cause) {
            setError(messageFromError(cause))
        } finally {
            setPending(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 px-3 py-3 backdrop-blur-[2px] sm:px-4">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                className="relative flex min-h-[655px] w-full max-w-[500px] flex-col overflow-hidden border border-[#67442c] bg-[#241611] text-[#f4e6d6] shadow-2xl"
            >
                <button
                    type="button"
                    aria-label="Fechar"
                    onClick={() => void navigate({ to: '/' })}
                    className="absolute right-3 top-2 z-10 p-1 text-[#bb783d] hover:text-[#f3b36b]"
                >
                    <X size={16} strokeWidth={1.5} />
                </button>

                <div className={`flex-1 pb-7 ${mode === 'register' ? 'px-[32px] pt-[45px] sm:px-[79px]' : 'flex flex-col justify-center px-[38px] sm:px-[59px]'}`}>
                    <h1
                        id="auth-modal-title"
                        className={`flex justify-center gap-1 whitespace-nowrap font-bold tracking-[0.02em] ${mode === 'register' ? 'text-[19px]' : 'text-[19px]'}`}
                    >
                        <Link
                            to="/login"
                            className={
                                mode === 'login'
                                    ? 'text-[#d9954f]'
                                    : 'text-[#f4e6d6]'
                            }
                        >
                            Entrar
                        </Link>

                        <span className="text-[#f4e6d6]">|</span>

                        <Link
                            to="/register"
                            className={
                                mode === 'register'
                                    ? 'text-[#d9954f]'
                                    : 'text-[#f4e6d6]'
                            }
                        >
                            Criar conta
                        </Link>
                    </h1>

                    <p className={`mx-auto text-center leading-[1.3] text-[#e4d4c6] ${mode === 'register' ? 'mb-[24px] mt-[38px] max-w-[355px] text-[12px]' : 'mb-[18px] mt-[28px] max-w-[355px] text-[12px]'}`}>
                        {mode === 'register'
                            ? 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'
                            : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}
                    </p>

                    <form onSubmit={submit} className={mode === 'register' ? 'space-y-[12px]' : 'space-y-[8px]'}>
                        {mode === 'register' && (
                            <input
                                className="field !h-[40px] !rounded-[4px] !px-[15px] !py-1 !text-[12px]"
                                aria-label="Nome de usuário"
                                placeholder="Nome de usuário"
                                required
                                minLength={2}
                                autoComplete="name"
                                value={name}
                                onChange={event => setName(event.target.value)}
                            />
                        )}

                        <input
                            className={`field !rounded-[4px] !py-1 placeholder:!text-[#a17a57] ${mode === 'register' ? '!h-[40px] !px-[15px] !text-[12px]' : '!h-[33px] !px-[12px] !text-[12px]'}`}
                            aria-label="E-mail"
                            type="email"
                            placeholder={mode === 'register' ? 'Digite seu e-mail' : 'contato@email.com'}
                            required
                            autoComplete="email"
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                        />

                        <div className="relative">
                            <input
                                className={`field !rounded-[4px] !py-1 !pr-10 placeholder:!text-[#a17a57] ${mode === 'register' ? '!h-[40px] !px-[15px] !text-[12px]' : '!h-[33px] !px-[12px] !text-[12px]'}`}
                                aria-label="Senha"
                                type={showPassword ? 'text' : 'password'}
                                placeholder={mode === 'register' ? 'Senha' : '************'}
                                required
                                minLength={mode === 'register' ? 8 : undefined}
                                autoComplete={
                                    mode === 'login'
                                        ? 'current-password'
                                        : 'new-password'
                                }
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                            />

                            <button
                                type="button"
                                aria-label={
                                    showPassword ? 'Ocultar senha' : 'Mostrar senha'
                                }
                                aria-pressed={showPassword}
                                onClick={() => setShowPassword(value => !value)}
                                className="absolute right-[9px] top-1/2 -translate-y-1/2 text-[#bf864a]"
                            >
                                {showPassword ? (
                                    <EyeOff size={16} />
                                ) : (
                                    <Eye size={16} />
                                )}
                            </button>
                        </div>

                        {mode === 'register' && (
                            <input
                                className="field !h-[40px] !rounded-[4px] !px-[15px] !py-1 !text-[12px] placeholder:!text-[#a17a57]"
                                aria-label="Confirmar senha"
                                type="password"
                                placeholder="Confirmar senha"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={event => setConfirmPassword(event.target.value)}
                            />
                        )}

                        {mode === 'login' ? (
                            <div className="flex justify-end pt-[2px]">
                                <span
                                    title="Recuperação de senha indisponível nesta demonstração"
                                    className="cursor-not-allowed text-[10px] text-[#d9954f]"
                                >
                                    Esqueceu a senha?
                                </span>
                            </div>
                        ) : null}

                        {error && (
                            <p role="alert" className="text-[11px] text-red-300">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={pending}
                            className={`btn-primary w-full !rounded-[4px] !p-0 ${mode === 'register' ? '!mt-[24px] !h-[46px] !text-[15px]' : '!mt-[18px] !h-[35px] !text-[15px]'}`}
                        >
                            {pending
                                ? 'Aguarde...'
                                : mode === 'login'
                                    ? 'Entrar'
                                    : 'Criar conta'}
                        </button>
                    </form>

                    <div className={`flex items-center gap-2 ${mode === 'register' ? 'mt-[28px]' : 'mt-[20px]'}`}>
                        <span className="h-px flex-1 bg-[#44291d]" />
                        <span className={`whitespace-nowrap text-[#dfd0c2] ${mode === 'register' ? 'text-[11px]' : 'text-[11px]'}`}>
                            Ou continue com
                        </span>
                        <span className="h-px flex-1 bg-[#44291d]" />
                    </div>

                    <div className={`space-y-[9px] ${mode === 'register' ? 'mt-[22px]' : 'mt-[9px]'}`}>
                        <button
                            type="button"
                            disabled
                            title="Login com Google não configurado"
                            className={`flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-[4px] border border-[#492b1e] text-[#c9a17d] ${mode === 'register' ? 'h-[40px] text-[12px]' : 'h-[31px] text-[12px]'}`}
                        >
                            <FaGoogle size={15} className="text-[#4285f4]" />
                            Continuar com Google
                        </button>

                        <button
                            type="button"
                            disabled
                            title="Login com Facebook não configurado"
                            className={`flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-[4px] border border-[#492b1e] text-[#c9a17d] ${mode === 'register' ? 'h-[40px] text-[12px]' : 'h-[31px] text-[12px]'}`}
                        >
                            <FaFacebookF
                                size={15}
                                className="text-[#4267b2]"
                            />
                            Continuar com Facebook
                        </button>
                    </div>
                </div>

                <div className="h-[7px] shrink-0 bg-[#d9954f]" />
            </section>
        </div>
    )
}
