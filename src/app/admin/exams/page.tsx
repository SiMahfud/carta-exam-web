import { redirect } from "next/navigation";

export default function LegacyExamListPage() {
    redirect("/admin/exam-templates");
}
