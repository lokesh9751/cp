export default function ContactPage() {
    const INSTAGRAM_URL = 'https://www.instagram.com/arthur_morgan9751/';
    const GITHUB_URL = 'https://github.com/lokesh9751';

    return (
        <div className="max-w-3xl mx-auto px-4 py-16">
            <div className="bg-bg-card border border-border rounded-lg p-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Contact</h1>
                    <p className="text-sm text-text-secondary mt-1">
                        Reach out or check out my work on the links below.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <a
                        href={INSTAGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 rounded-lg bg-bg-section border border-border hover:border-navy transition-colors no-underline block"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Instagram
                        </p>
                        <p className="text-base font-semibold text-text-primary mt-1">
                            arthur_morgan9751
                        </p>
                    </a>

                    <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 rounded-lg bg-bg-section border border-border hover:border-navy transition-colors no-underline block"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            GitHub
                        </p>
                        <p className="text-base font-semibold text-text-primary mt-1">
                            lokesh9751
                        </p>
                    </a>
                </div>
            </div>
        </div>
    );
}