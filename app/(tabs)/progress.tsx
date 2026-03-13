// app/progress.tsx

import { useEffect, useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { StatsRepository } from "../../database/statsRepository"
import { useDatabase } from "../../hooks/useDatabase"

export default function ProgressScreen() {

    const { db, loading } = useDatabase()

    const [accuracy, setAccuracy] = useState(0)
    const [topics, setTopics] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])

    const statsRepo = db ? new StatsRepository(db) : null
    const userId = 1

    // ---------- load stats ----------

    async function loadProgress() {

        if (!statsRepo) return

        await statsRepo.debugTopics()

        const acc =
            await statsRepo.getAccuracy(userId)

        const topicData =
            await statsRepo.getTopicProgress(userId)

        const subjectData =
            await statsRepo.getSubjectProgress(userId)

        setAccuracy(acc)
        setTopics(topicData)
        setSubjects(subjectData)

    }

    useEffect(() => {

        if (!statsRepo) return

        loadProgress()

    }, [statsRepo])

    if (!loading || !db) {
        return <Text>Loading database...</Text>
    }

    // ---------- header ----------

    function renderHeader() {

        return (
            <Text style={styles.title}>
                Progress
            </Text>
        )

    }

    // ---------- accuracy ----------

    function renderAccuracy() {

        return (

            <View style={styles.card}>

                <Text style={styles.cardTitle}>
                    Overall Accuracy
                </Text>

                <Text style={styles.bigValue}>
                    {accuracy}%
                </Text>

            </View>

        )

    }

    // ---------- topic progress ----------

    function renderTopicProgress() {

        return (

            <View style={styles.card}>

                <Text style={styles.cardTitle}>
                    Topics
                </Text>

                {topics.map(t => (

                    <View
                        key={t.topicId}
                        style={styles.row}
                    >

                        <Text>
                            {t.topicName}
                        </Text>

                        <Text>
                            {t.progress}%
                        </Text>

                    </View>

                ))}

            </View>

        )

    }

    // ---------- subject progress ----------

    function renderSubjectProgress() {
        console.log("Subject progress:", subjects)
        return (

            <View style={styles.card}>

                <Text style={styles.cardTitle}>
                    Subjects
                </Text>

                {subjects.map(s => (

                    <View
                        key={s.subjectId}
                        style={styles.row}
                    >

                        <Text>
                            {s.subjectName}
                        </Text>

                        <Text>
                            {s.progress}%
                        </Text>

                    </View>

                ))}

            </View>

        )

    }

    return (

        <ScrollView style={styles.container}>

            {renderHeader()}

            {renderAccuracy()}

            {renderTopicProgress()}

            {renderSubjectProgress()}

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
        marginBottom: 20,
        textAlign: "center"
    },

    card: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        marginBottom: 16
    },

    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 10
    },

    bigValue: {
        fontSize: 36,
        textAlign: "center",
        fontWeight: "700"
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 4
    }

})