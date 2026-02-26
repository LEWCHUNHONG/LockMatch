import { View, TextInput, Text, StyleSheet } from 'react-native';

export default function AuthInput({ placeholder, value, onChangeText, secureTextEntry = false, error }) {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="#999"
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: { marginBottom: 20 },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
  },
  error: { color: 'red', marginLeft: 12, marginTop: 4 },
});