import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from "react-native";

import { getRandomTableQuestion } from "../engine/tablesGenerator";

export default function Practice(){

    const params: any = useLocalSearchParams();

    const [question, setQuestion] = useState<any>(null);
    const [answer, setAnswer] = useState("");
    const [result, setResult] = useState<"correct" | "wrong" | null>(null);

    const [settingsOpen, setSettingsOpen] = useState(false);

    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [autoNext, setAutoNext] = useState(true);
    const [autoNextDelay, setAutoNextDelay] = useState(2);
    const [correctCount,setCorrectCount] = useState(0);
    const [attemptCount,setAttemptCount] = useState(0);

useEffect(()=>{
    loadQuestion();
},[]);

    function loadQuestion() {

        if (params.topicName === "Tables") {
            const q = getRandomTableQuestion();
            setQuestion(q);
        }

    }

    function submitAnswer() {

        if (!question) return;

        if (Number(answer) === question.answer) {
            setResult("correct");
        } else {
            setResult("wrong");
        }

        if (autoNext) {
            setTimeout(() => {
                nextQuestion();
            }, autoNextDelay * 1000);
        }

    }

    function nextQuestion() {
        setAnswer("");
        setResult(null);
        loadQuestion();
}

    if (!question) {
return(
    <View style={styles.container}>
        <Text>Loading...</Text>
</View>
);
}

return(

    <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
    >

        <View style={styles.container}>

            {/* Top bar */}

            <View style={styles.topBar}>

                <Pressable onPress={() => setTtsEnabled(!ttsEnabled)}>
                    <MaterialCommunityIcons
                        name={ttsEnabled ? "volume-high" : "volume-off"}
                        size={26}
                        color="#333"
                    />
                </Pressable>

                <Pressable onPress={() => setSettingsOpen(true)}>
                    <MaterialCommunityIcons
                        name="cog"
                        size={26}
                        color="#333"
                    />
                </Pressable>

            </View>

            <Text style={styles.question}>{question.question}</Text>

            <TextInput
                value={answer}
                onChangeText={setAnswer}
                keyboardType="numeric"
                placeholder="Enter answer"
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={submitAnswer}
/>

            <View style={styles.feedbackArea}>

                {result === "correct" && (
                    <Text style={styles.correct}>🎉 Correct!</Text>
                )}

                {result === "wrong" && (
                    <Text style={styles.wrong}>
                        ❌ Wrong. Correct answer: {question.answer}
                    </Text>
                )}

</View>

            <Pressable style={styles.submitButton} onPress={submitAnswer}>
                <Text style={styles.buttonText}>Submit</Text>
            </Pressable>

            <Pressable style={styles.nextButton} onPress={nextQuestion}>
                <Text style={styles.buttonText}>Next Question</Text>
            </Pressable>

        </View>

        {/* Settings Modal */}

        <Modal
            visible={settingsOpen}
            transparent
            animationType="slide"
        >

            <View style={styles.modalBackground}>

                <View style={styles.modalBox}>

                    <Text style={styles.modalTitle}>Settings</Text>

                    <View style={styles.settingRow}>
                        <Text>Auto Next</Text>
                        <Switch value={autoNext} onValueChange={setAutoNext} />
                    </View>

                    <View style={styles.settingRow}>
                        <Text>TTS Voice</Text>
                        <Switch value={ttsEnabled} onValueChange={setTtsEnabled} />
                    </View>

                    <View style={styles.settingRow}>
                        <Text>Auto Next Delay: {autoNextDelay}s</Text>
                    </View>

                    <View style={styles.delayButtons}>

                        <Pressable
                            style={styles.delayBtn}
                            onPress={() => setAutoNextDelay(2)}
                        >
                            <Text>2s</Text>
                        </Pressable>

                        <Pressable
                            style={styles.delayBtn}
                            onPress={() => setAutoNextDelay(3)}
                        >
                            <Text>3s</Text>
                        </Pressable>

                        <Pressable
                            style={styles.delayBtn}
                            onPress={() => setAutoNextDelay(5)}
                        >
                            <Text>5s</Text>
                        </Pressable>

                    </View>

                    <Pressable
                        style={styles.closeBtn}
                        onPress={() => setSettingsOpen(false)}
                    >
                        <Text style={{ color: "white" }}>Close</Text>
                    </Pressable>

                </View>

            </View>

        </Modal>

    </KeyboardAvoidingView>

);

}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
        backgroundColor: "#f5f5f5"
    },

    topBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        position: "absolute",
        top: 20,
        right: 20,
        left: 20
    },

    question: {
        fontSize: 36,
        textAlign: "center",
        marginBottom: 40
    },

    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 16,
        fontSize: 22,
        textAlign: "center",
        borderRadius: 8,
        backgroundColor: "white"
    },

    feedbackArea: {
        height: 60,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20
    },

    correct: {
        color: "green",
        fontSize: 22,
        fontWeight: "bold"
    },

    wrong: {
        color: "red",
        fontSize: 20,
        textAlign: "center"
    },

    submitButton: {
        backgroundColor: "#2196F3",
        padding: 14,
        borderRadius: 8,
        marginTop: 20,
        alignItems: "center"
    },

    nextButton: {
        backgroundColor: "#1976D2",
        padding: 14,
        borderRadius: 8,
        marginTop: 12,
        alignItems: "center"
    },

    buttonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold"
    },

    modalBackground: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.4)"
    },

    modalBox: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
        width: "80%"
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15
    },

    settingRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 10
    },

    delayButtons: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 10
    },

    delayBtn: {
        backgroundColor: "#eee",
        padding: 10,
        borderRadius: 6
    },

    closeBtn: {
        marginTop: 20,
        backgroundColor: "#2196F3",
        padding: 12,
        alignItems: "center",
        borderRadius: 8
}

});