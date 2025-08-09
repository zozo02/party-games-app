import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';

export default function Screen({ children, footer }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0b12' },
  container: { flex: 1, padding: 16 },
  footer: { borderTopWidth: 1, borderTopColor: '#222', padding: 8 }
});
