import { addCard } from '@/src/cardStore';
import { useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AddScreen() {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Add Card</Text>

            <Text style={styles.label}>Question</Text>

            <TextInput
                style={styles.input}
                placeholder="What is DNS?"
                placeholderTextColor="#9CA3AF"
                value={question}
                onChangeText={setQuestion}
            />

            <Text style={styles.label}>Answer</Text>

            <TextInput
                style={[styles.input, styles.answerInput]}
                placeholder="DNS translates names into IP addresses."
                placeholderTextColor="#9CA3AF"
                multiline
                value={answer}
                onChangeText={setAnswer}
            />

            <TouchableOpacity
                style={styles.button}
                onPress={() => {
                    addCard(question, answer);
                    Keyboard.dismiss();
                    Alert.alert('Card Saved!', 'Your card was added temporarily.');

                    setQuestion('');
                    setAnswer('');
                }}>


                <Text style={styles.buttonText}>Save Card</Text>

            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
        padding: 24,
    },

    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 30,
    },

    label: {
        color: 'white',
        marginBottom: 8,
        fontSize: 16,
    },

    input: {
        backgroundColor: '#1F2937',
        color: 'white',
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
    },

    answerInput: {
        minHeight: 120,
        textAlignVertical: 'top',
    },

    button: {
        backgroundColor: '#2563EB',
        padding: 18,
        borderRadius: 12,
        marginTop: 10,
    },

    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: '600',
        fontSize: 18,
    },
});