// app/practice.tsx

import {
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native"

import { usePractice } from "../hooks/usePractice"

import AnswerActions from "../components/AnswerActions"
import ScoreHeader from "../components/ScoreHeader"

import { PracticeController } from "../controllers/practiceController"
import { QuestionQueue } from "../engine/practice/questionQueue"
import { BatchLoader } from "../engine/questions/batchLoader"
import { ReviewScheduler } from "../engine/scheduler/reviewScheduler"

import { ReviewRepository } from "../database/reviewRepository"
import { useController } from "../hooks/useController"
import { useDatabase } from "../hooks/useDatabase"


export default function PracticeScreen() {

    const { db, ready } = useDatabase()

    const controller = useController(() => {

        if (!db) return null

        const scheduler = new ReviewScheduler({
            questions: [],
            reviews: []
        })

        const queue = new QuestionQueue({
            loadQuestions: async (limit: number) => {

                const batchLoader = new BatchLoader({
                    batchSize: limit
                })

                return batchLoader.loadBatch()

            }
        })

        const repo = new ReviewRepository(db)

        return new PracticeController(
            1,
            scheduler,
            queue,
            repo
        )

    })

    const practice = usePractice(controller)

    if (!ready || !db || !controller) {
        return <Text>Loading database...</Text>
    }

    // ---------- render header ----------

    function renderHeader() {

        return (

            <ScoreHeader
                attempts={practice.stats.attempts}
                correct={practice.stats.correct}
                accuracy={practice.accuracy}
            />

        )

    }

    // ---------- render question ----------

    function renderQuestion() {

        if (!practice.question) return null

        return (

            <Text style={styles.question}>
                {practice.question.question}
            </Text>

        )

    }

    // ---------- render input ----------

    function renderInput() {

        return (

            <TextInput
                style={styles.input}

                value={practice.answer}

                onChangeText={practice.setAnswer}

                keyboardType="numeric"

                returnKeyType="done"

                onSubmitEditing={() =>
                    practice.submitAnswer("good")
                }

            />

        )

    }

    // ---------- render result ----------

    function renderResult() {

        if (!practice.result) return null

        if (practice.result.correct) {

            return (
                <Text style={styles.correct}>
                    🎉 Correct!
                </Text>
            )

        }

        return (

            <Text style={styles.wrong}>
                ❌ Wrong. Correct answer:{" "}
                {practice.result.correctAnswer}
            </Text>

        )

    }

    // ---------- render actions ----------

    function renderActions() {

        return (

            <AnswerActions

                answered={!!practice.result}

                onSubmit={() =>
                    practice.submitAnswer("good")
                }

                onNext={() =>
                    practice.nextQuestion()
                }

                onRate={(rating) =>
                    practice.submitAnswer(rating)
                }

            />

        )

    }

    return (

        <View style={styles.container}>

            {renderHeader()}

            {renderQuestion()}

            {renderInput()}

            {renderResult()}

            {renderActions()}

        </View>

    )

}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        padding: 20
    },

    question: {
        fontSize: 32,
        textAlign: "center",
        marginVertical: 30
    },

    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 12,
        borderRadius: 8,
        fontSize: 20,
        textAlign: "center"
    },

    correct: {
        color: "green",
        textAlign: "center",
        marginTop: 20
    },

    wrong: {
        color: "red",
        textAlign: "center",
        marginTop: 20
    }

})