import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import Screen from '../../components/Screen';
import AdBanner from '../../components/AdBanner';
import { auth } from '../../firebase';
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential).catch(e=>Alert.alert('Erreur', e.message));
    }
  }, [response]);

  const onApple = async () => {
    try {
      const appleCredential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      const provider = new OAuthProvider('apple.com');
      const cred = provider.credential({ idToken: appleCredential.identityToken });
      await signInWithCredential(auth, cred);
    } catch (e) {
      if (e.code !== 'ERR_CANCELED') Alert.alert('Apple Sign-In', e.message);
    }
  };

  const onEmail = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      Alert.alert('Connexion', e.message);
    }
  };

  return (
    <Screen footer={<AdBanner />}>
      <Text style={styles.title}>Connexion</Text>
      <TextInput placeholder="Email" placeholderTextColor="#8a8aa3" style={styles.input} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput placeholder="Mot de passe" placeholderTextColor="#8a8aa3" style={styles.input} secureTextEntry onChangeText={setPassword} />
      <Pressable style={styles.btn} onPress={onEmail}><Text style={styles.btnText}>Se connecter</Text></Pressable>

      <Pressable style={[styles.btn, styles.google]} disabled={!request} onPress={()=>promptAsync()}>
        <Text style={styles.btnText}>Continuer avec Google</Text>
      </Pressable>

      {AppleAuthentication.isAvailableAsync() && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={6}
          style={{ height: 44, marginTop: 10 }}
          onPress={onApple}
        />
      )}

      <Pressable onPress={()=>navigation.navigate('SignUp')} style={{marginTop:16}}>
        <Text style={{color:'#bfc0ff'}}>Créer un compte</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: '#141421', color: 'white', borderRadius: 8, padding: 12, marginVertical: 6 },
  btn: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 8, marginTop: 10, alignItems:'center' },
  google: { backgroundColor: '#db4437' },
  btnText: { color: 'white', fontWeight: '700' }
});
