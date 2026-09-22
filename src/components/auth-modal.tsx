'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Lock, Mail, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { user, isConfigured, signIn, signUp, signOut } = useAuth();
  const { toast } = useToast();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Vyplňte prosím e-mail i heslo.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (isRegisterMode) {
        await signUp(email, password);
        toast({
          title: 'Registrace úspěšná',
          description: 'Pokladna byla úspěšně zaregistrována a data se synchronizují.',
          variant: 'success',
        });
      } else {
        await signIn(email, password);
        toast({
          title: 'Přihlášeno',
          description: 'Účet pokladny je aktivní. Přihlášení zůstane trvalé.',
          variant: 'success',
        });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let message = 'Nastala chyba při ověření.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        message = 'Nesprávný e-mail nebo heslo.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Tento e-mail již má vytvořený účet. Přepněte na přihlášení.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Heslo musí mít alespoň 6 znaků.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Zadejte platnou e-mailovou adresu.';
      } else if (err.message) {
        message = err.message;
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Odhlášeno',
        description: 'Byli jste odhlášeni. Aplikace nyní běží v lokálním režimu.',
      });
      onClose();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description: 'Odhlášení se nezdařilo.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Store className="h-5 w-5 text-primary" />
            {user ? 'Správa účtu provozovny' : isRegisterMode ? 'Registrace nové provozovny' : 'Přihlášení pokladny'}
          </DialogTitle>
          <DialogDescription>
            {user
              ? 'Tato pokladna je spárována s vaším cloudovým účtem a v reálném čase se synchronizuje.'
              : 'Přihlaste se ke stejnému účtu na všech svých pokladnách pro automatickou synchronizaci v reálném čase.'}
          </DialogDescription>
        </DialogHeader>

        {!isConfigured && (
          <Alert variant="destructive" className="my-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Firebase není nakonfigurován</AlertTitle>
            <AlertDescription className="text-xs">
              V souboru <code>.env.local</code> chybí přístupové údaje z Firebase Console. Data fungují lokálně.
            </AlertDescription>
          </Alert>
        )}

        {user ? (
          <div className="space-y-4 py-3">
            <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
              <div className="text-xs text-muted-foreground">Přihlášený účet:</div>
              <div className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {user.email}
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                Relace je trvalá. Zůstanete přihlášeni i po vypnutí zařízení nebo prohlížeče.
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              Odhlásit tuto pokladnu
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMsg && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="auth-email">E-mail provozovny / pokladny</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="např. kassa@mojefirma.cz"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || !isConfigured}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-password">Heslo</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || !isConfigured}
                  required
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              🛡️ Přihlášení neexpiruje. Jakmile pokladnu jednou přihlásíte, zůstane spárovaná navždy.
            </div>

            <Button type="submit" className="w-full" disabled={loading || !isConfigured}>
              {loading
                ? 'Zpracovávám...'
                : isRegisterMode
                ? 'Vytvořit účet provozovny'
                : 'Přihlásit pokladnu'}
            </Button>

            <div className="text-center pt-2">
              <Button
                type="button"
                variant="link"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setErrorMsg(null);
                }}
              >
                {isRegisterMode
                  ? 'Už máte účet? Přihlaste se zde'
                  : 'Nemáte ještě účet? Zaregistrujte novou provozovnu'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
