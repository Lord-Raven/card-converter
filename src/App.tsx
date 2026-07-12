import './App.css';
import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from 'react';

type ConvertedFile = {
    id: string;
    sourceName: string;
    outputName: string;
    downloadUrl: string;
    byteSize: number;
};

function convertToStandardFields(input: any): any {
    // Placeholder conversion logic. Replace this with your object-to-object mapping.
    const newObject = {
        spec: "chara_card_v2",
        spec_version: "2.0",
        "data": {
            "name": input?.name ?? input?.data?.name ?? "Unknown",
            "description": input?.description ?? input?.data?.description ?? input?.personality ?? input?.data?.personality ?? "Character description goes here.",
            "personality": "", // Obsolete
            "first_mes": input?.first_mes ?? input?.data?.first_mes ?? input?.greeting ?? input?.data?.greeting ?? "\"Hey, {{user}}, can I ask you a question?\"",
            "avatar": input?.avatar ?? input?.data?.avatar ?? input?.imageUrl ?? input?.data?.imageUrl ?? "",
            "mes_example": input?.mes_example ?? input?.data?.mes_example ?? input?.exampleConversation ?? input?.data?.exampleConversation ?? "",
            "scenario": input?.scenario ?? input?.data?.scenario ?? "",
            "creator_notes": input?.creator_notes ?? input?.data?.creator_notes ?? "Creator notes go here.",
            "system_prompt": input?.system_prompt ?? input?.data?.system_prompt ?? "",
            "post_history_instructions": input?.post_history_instructions ?? input?.data?.post_history_instructions ?? "",
            "alternative_greetings": input?.alternative_greetings ?? input?.data?.alternative_greetings ?? [],
            "tags": input?.tags ?? input?.data?.tags ?? [],
            "creator": input?.creator ?? input?.data?.creator ?? "",
            "character_version": "main",
            "extensions": input?.extensions ?? input?.data?.extensions ?? {},
            "character_book": input?.character_book ?? input?.data?.character_book ?? {}
        }
    }
    
    return newObject;
}

function App() {
    const [isDragging, setIsDragging] = useState(false);
    const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const revokeUrls = useCallback((files: ConvertedFile[]) => {
        files.forEach((file) => URL.revokeObjectURL(file.downloadUrl));
    }, []);

    useEffect(() => {
        return () => {
            revokeUrls(convertedFiles);
        };
    }, [convertedFiles, revokeUrls]);

    const createOutputFileName = (sourceName: string) => {
        const withoutExtension = sourceName.replace(/\.json$/i, '');
        return `${withoutExtension}.converted.json`;
    };

    const convertFiles = useCallback(
        async (files: File[]) => {
            if (!files.length) {
                return;
            }

            setErrorMessage(null);
            const nextFiles: ConvertedFile[] = [];
            const errors: string[] = [];

            for (const file of files) {
                try {
                    const fileText = await file.text();
                    const parsed = JSON.parse(fileText);
                    const converted = convertToStandardFields(parsed);
                    const outputJson = JSON.stringify(converted, null, 2);
                    const blob = new Blob([outputJson], { type: 'application/json' });

                    nextFiles.push({
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                        sourceName: file.name,
                        outputName: createOutputFileName(file.name),
                        downloadUrl: URL.createObjectURL(blob),
                        byteSize: blob.size,
                    });
                } catch (error) {
                    errors.push(`Could not process ${file.name}. Ensure it is valid JSON.`);
                }
            }

            if (errors.length) {
                setErrorMessage(errors.join(' '));
            }

            if (!nextFiles.length) {
                return;
            }

            setConvertedFiles((previous) => [...nextFiles, ...previous]);
        },
        []
    );

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(event.dataTransfer.files).filter(
            (file) => file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')
        );

        void convertFiles(droppedFiles);
    };

    const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);
        void convertFiles(selectedFiles);
        event.target.value = '';
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const handleClear = () => {
        revokeUrls(convertedFiles);
        setConvertedFiles([]);
        setErrorMessage(null);
    };


    return (
        <div className="App">
            <header className="App-header">
                <h1>JSON Card Converter</h1>
            </header>

            <main className="workspace">
                <section
                    className={`drop-pane ${isDragging ? 'drop-pane-active' : ''}`}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <h2>Input</h2>
                    <p>Drop JSON files here</p>
                    <p className="helper-text">or</p>
                    <button type="button" onClick={handleBrowseClick} className="secondary-button">
                        Select Files
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden-input"
                    />
                </section>

                <section className="output-pane">
                    <div className="output-pane-header">
                        <h2>Converted Files</h2>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="secondary-button"
                            disabled={!convertedFiles.length}
                        >
                            Clear
                        </button>
                    </div>

                    {errorMessage && <p className="error-text">{errorMessage}</p>}

                    {!convertedFiles.length ? (
                        <p className="placeholder-text">Converted files will appear here.</p>
                    ) : (
                        <ul className="download-list">
                            {convertedFiles.map((file) => (
                                <li key={file.id} className="download-item">
                                    <div>
                                        <p className="source-name">{file.sourceName}</p>
                                        <p className="output-name">{file.outputName}</p>
                                    </div>
                                    <a href={file.downloadUrl} download={file.outputName} className="download-link">
                                        Download ({Math.max(1, Math.round(file.byteSize / 1024))} KB)
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </div>
    );
}

export default App;
