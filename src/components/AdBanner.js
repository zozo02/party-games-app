import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function AdBanner() {
  return (
    <View style={styles.ad}>
      <Text style={styles.text}>[Espace Pub]</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  ad: { height: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141421' },
  text: { color: '#8a8aa3', fontSize: 12 }
});
