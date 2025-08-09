import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import Screen from '../../components/Screen';
import AdBanner from '../../components/AdBanner';
import { auth } from '../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      Alert.alert('Compte créé', 'Tu es connecté.');
    } catch (e) {
      Alert.alert('Inscription', e.message);
    }
  };

  return (
    <Screen footer={<AdBanner />}>
      <Text style={styles.title}>Créer un compte</Text>
      <TextInput placeholder="Email" placeholderTextColor="#8a8aa3" style={styles.input} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput placeholder="Mot de passe (min 6)" placeholderTextColor="#8a8aa3" style={styles.input} secureTextEntry onChangeText={setPassword} />
      <Pressable style={styles.btn} onPress={onSignUp}><Text style={styles.btnText}>S'inscrire</Text></Pressable>
      <Pressable onPress={()=>navigation.goBack()} style={{marginTop:16}}>
        <Text style={{color:'#bfc0ff'}}>J'ai déjà un compte</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: '#141421', color: 'white', borderRadius: 8, padding: 12, marginVertical: 6 },
  btn: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 8, marginTop: 10, alignItems:'center' },
  btnText: { color: 'white', fontWeight: '700' }
});
