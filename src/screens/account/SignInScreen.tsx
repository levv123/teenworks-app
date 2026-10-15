/**
 * Sign in / Create account — one screen with two modes, opened from Profile or
 * from a flow that needs an account. On success it goes back to wherever the
 * user came from, now signed in.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C, S } from '../../design/tokens';
import type { Nav, Route } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { NOT_CONFIGURED, useSession } from '../../store/SessionStore';
import { AppText, Card, PrimaryButton, Screen, ScreenHeader, TextField } from '../../ui';

type Mode = 'sign-in' | 'sign-up';

const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

function validate(mode: Mode, name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === 'sign-up' && name.trim().length === 0) errors.name = 'Enter your name.';
  if (email.trim().length === 0) errors.email = 'Enter your email.';
  else if (!EMAIL_RE.test(email.trim())) errors.email = "That doesn't look like an email address.";
  if (password.length === 0) errors.password = 'Enter your password.';
  else if (mode === 'sign-up' && password.length < MIN_PASSWORD) {
    errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  }
  return errors;
}

export function SignInScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route<'SignIn'>>();
  const { showToast } = useApp();
  const { status, configured, signIn, signUp } = useSession();

  const [mode, setMode] = useState<Mode>(params?.mode ?? 'sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** Set once a sign-up is waiting on its confirmation email. */
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);

  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const leave = useCallback(() => {
    if (nav.canGoBack()) nav.goBack();
    else nav.navigate('Tabs', { screen: 'Home' });
  }, [nav]);

  // Covers a session that arrives from elsewhere too, e.g. the confirmation link.
  const wasSignedIn = useRef(status === 'signed-in');
  useEffect(() => {
    if (status === 'signed-in' && !wasSignedIn.current) leave();
    wasSignedIn.current = status === 'signed-in';
  }, [status, leave]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setAttempted(false);
    setFormError(null);
    setConfirmSentTo(null);
  };

  // Once a submit has failed validation, errors clear as the user fixes them.
  const recheck = (n: string, e: string, p: string) => {
    if (attempted) setErrors(validate(mode, n, e, p));
  };

  const submit = async () => {
    if (busy) return;
    const found = validate(mode, name, email, password);
    setAttempted(true);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (mode === 'sign-in') {
        await signIn(cleanEmail, password);
        showToast('Signed in');
      } else {
        const result = await signUp(name.trim(), cleanEmail, password);
        if (result === 'confirm-email') {
          if (mounted.current) setConfirmSentTo(cleanEmail);
        } else {
          showToast('Account created');
        }
      }
    } catch (err) {
      if (mounted.current) {
        setFormError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const signingUp = mode === 'sign-up';
  const title = signingUp ? 'Create account' : 'Sign in';

  if (!configured) {
    return (
      <Screen header={<ScreenHeader title={title} onBack={leave} />}>
        <Card style={styles.card}>
          <AppText variant="body" color={C.textMuted}>
            {NOT_CONFIGURED}
          </AppText>
        </Card>
      </Screen>
    );
  }

  if (confirmSentTo !== null) {
    return (
      <Screen header={<ScreenHeader title="Check your email" onBack={leave} />}>
        <Card style={styles.card}>
          <AppText variant="h3">Confirm your email to finish</AppText>
          <AppText variant="body" color={C.textMuted} style={styles.cardBody}>
            {`We sent a link to ${confirmSentTo}. Open it on this device, then come back and sign in.`}
          </AppText>
        </Card>
        <PrimaryButton
          label="Back to sign in"
          onPress={() => switchMode('sign-in')}
          style={styles.cta}
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={<ScreenHeader title={title} onBack={leave} />}
      footer={
        <>
          {formError ? (
            <AppText
              variant="small"
              color={C.danger}
              accessibilityLiveRegion="polite"
              style={styles.footerNote}
            >
              {formError}
            </AppText>
          ) : null}
          <PrimaryButton label={title} onPress={submit} loading={busy} />
        </>
      }
    >
      <AppText variant="body" color={C.textMuted} style={styles.intro}>
        {signingUp
          ? 'Make an account to save your services and apply to gigs.'
          : 'Welcome back. Sign in to save your services and apply to gigs.'}
      </AppText>

      {signingUp ? (
        <TextField
          label="Name"
          value={name}
          onChangeText={(next) => {
            setName(next);
            recheck(next, email, password);
          }}
          placeholder="Your first and last name"
          autoCapitalize="words"
          autoComplete="name"
          error={errors.name}
          style={styles.field}
        />
      ) : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={(next) => {
          setEmail(next);
          recheck(name, next, password);
        }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
        style={styles.field}
      />

      <TextField
        label="Password"
        value={password}
        onChangeText={(next) => {
          setPassword(next);
          recheck(name, email, next);
        }}
        placeholder={signingUp ? `At least ${MIN_PASSWORD} characters` : 'Your password'}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={signingUp ? 'new-password' : 'current-password'}
        onSubmitEditing={submit}
        error={errors.password}
        style={styles.field}
      />

      <View style={styles.switchRow}>
        <AppText variant="small" color={C.textMuted}>
          {signingUp ? 'Already have an account?' : 'New to TeenWorks?'}
        </AppText>
        <Pressable
          onPress={() => switchMode(signingUp ? 'sign-in' : 'sign-up')}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.switchLink, pressed && styles.pressed]}
        >
          <AppText variant="bodyBold">{signingUp ? 'Sign in' : 'Create an account'}</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: S.sm,
  },
  field: {
    marginTop: S.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: S.xl,
  },
  switchLink: {
    marginLeft: S.sm,
  },
  card: {
    marginTop: S.base,
  },
  cardBody: {
    marginTop: S.sm,
  },
  cta: {
    marginTop: S.xl,
  },
  footerNote: {
    marginBottom: S.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
