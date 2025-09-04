"use client";

import { useState } from 'react';
import { signInWithEmailAndPassword, AuthErrorCodes } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que a página seja recarregada
    setIsLoading(true);
    setError(null); // Limpa erros anteriores

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Login bem-sucedido:
      // Redirecionar para a página de administração (Ex: router.push('/admin'))
      console.log('Login bem-sucedido!');

    } catch (firebaseError: any) {
      // Exibe uma mensagem de erro amigável ao usuário
      switch (firebaseError.code) {
        case AuthErrorCodes.INVALID_EMAIL:
          setError('O endereço de e-mail está mal formatado.');
          break;
        case AuthErrorCodes.USER_NOT_FOUND:
        case AuthErrorCodes.WRONG_PASSWORD:
          setError('E-mail ou senha incorretos.');
          break;
        default:
          setError('Ocorreu um erro ao tentar fazer login. Tente novamente.');
      }
      console.error("Erro do Firebase:", firebaseError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>Painel de Administração</h1>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">E-mail</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Senha</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'A entrar...' : 'Entrar'}
        </button>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}