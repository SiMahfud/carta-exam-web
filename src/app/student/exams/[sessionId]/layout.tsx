export default function ExamSessionLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // No header/footer - full screen exam mode
    return (
        <div className="min-h-screen bg-background">
            {children}
        </div>
    );
}
