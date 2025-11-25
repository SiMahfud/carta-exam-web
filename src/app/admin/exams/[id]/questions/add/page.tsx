import QuestionForm from "@/components/question-form"

export default function AddQuestionPage({ params }: { params: { id: string } }) {
    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Tambah Soal Baru</h2>
            <QuestionForm examId={params.id} />
        </div>
    )
}
