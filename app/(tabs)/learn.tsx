// app/learn.tsx

type Card = {
    question: string
    answer: string
}

import { useMemo, useState } from "react"
import {
    Button,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native"

import FlashCard from "../../components/FlashCard"
import { LearnController } from "../../controllers/learnController"

export default function LearnScreen() {

    const controller = useMemo(
        () => new LearnController(),
        []
    )

    const [card, setCard] = useState<Card | null>(null)

    const [progress, setProgress] = useState({
        current: 0,
        total: 0
    })

    // ---------- load table ----------

    function loadTable(table: number) {

        controller.loadTables(table)

        const c = controller.getCurrentCard() as Card | null

        setCard(c)

        setProgress(controller.getProgress())

    }

    // ---------- next card ----------

    function nextCard() {

        const c = controller.next() as Card | null

        setCard(c)

        setProgress(controller.getProgress())

    }

    // ---------- previous card ----------

    function prevCard() {

        const c = controller.previous() as Card | null

        setCard(c)

        setProgress(controller.getProgress())

    }

    // ---------- speak ----------

    function speakQuestion() {

        controller.speak()

    }

    // ---------- header ----------

    function renderHeader() {

        return (
            <Text style={styles.title}>
                Learn Tables
            </Text>
        )

    }

    // ---------- table selector ----------

    function renderTableSelector() {

        const tables = []

        for (let i = 1; i <= 10; i++) {

            tables.push(
                <Button
                    key={i}
                    title={`Table ${i}`}
                    onPress={() => loadTable(i)}
                />
            )

        }

        return (

            <View style={styles.selector}>
                {tables}
            </View>

        )

    }

    // ---------- flashcard ----------

    function renderFlashCard() {

        if (!card) {

            return (
                <Text style={styles.placeholder}>
                    Select a table to start learning
                </Text>
            )

        }

        return (

            <FlashCard
                question={card.question}
                answer={card.answer}
            />

        )

    }

    // ---------- controls ----------

    function renderControls() {

        if (!card) return null

        return (

            <View style={styles.controls}>

                <Button
                    title="Previous"
                    onPress={prevCard}
                />

                <Button
                    title="🔊 Speak"
                    onPress={speakQuestion}
                />

                <Button
                    title="Next"
                    onPress={nextCard}
                />

            </View>

        )

    }

    // ---------- progress ----------

    function renderProgress() {

        if (!card) return null

        return (

            <Text style={styles.progress}>
                {progress.current} / {progress.total}
            </Text>

        )

    }

    return (

        <ScrollView style={styles.container}>

            {renderHeader()}

            {renderTableSelector()}

            {renderFlashCard()}

            {renderControls()}

            {renderProgress()}

        </ScrollView>

    )

}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        padding: 20
    },

    title: {
        fontSize: 28,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 20
    },

    selector: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 20
    },

    controls: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20
    },

    progress: {
        textAlign: "center",
        marginTop: 10,
        color: "#666"
    },

    placeholder: {
        textAlign: "center",
        marginVertical: 40,
        fontSize: 16
    }

})