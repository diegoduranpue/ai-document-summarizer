"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

type Summary = {
  title: string;
  overview: string[];
  keyIdeas: string[];
  keywords: string[];
  headings: string[];
  wordCount: number;
  readingMinutes: number;
  teacher: string[];
  students: string[];
};

const STOP_WORDS = new Set(
  `a al algo algunas algunos ante antes como con contra cual cuando de del desde donde dos el ella ellas ellos en entre era es esa ese eso esta estaba están este esto fue ha hasta hay la las le les lo los más me mi muy no nos o para pero por porque que qué se si sin sobre son su sus te tiene todo un una uno y ya
  the a an and are as at be because been but by can could did do does for from had has have he her here him his how i if in into is it its may more most my no not of on one or our she so some than that their them then there these they this to too up was we were what when where which who will with would you your`.split(/\s+/)
);

function cleanText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`>#|]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wordsFrom(text: string) {
  return (text.toLowerCase().match(/[a-záéíóúüñ]{3,}/gi) ?? []).filter(
    (word) => !STOP_WORDS.has(word)
  );
}

function splitSentences(text: string) {
  return cleanText(text)
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÜÑ0-9¿¡])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 45 && sentence.length <= 420);
}

function rankSentences(text: string, limit: number) {
  const sentences = splitSentences(text);
  if (!sentences.length) {
    return cleanText(text)
      .split(/\n+/)
      .filter((line) => line.length > 35)
      .slice(0, limit);
  }

  const frequencies = new Map<string, number>();
  wordsFrom(text).forEach((word) => frequencies.set(word, (frequencies.get(word) ?? 0) + 1));
  const maxFrequency = Math.max(...frequencies.values(), 1);

  return sentences
    .map((sentence, index) => {
      const words = wordsFrom(sentence);
      const relevance = words.reduce(
        (sum, word) => sum + (frequencies.get(word) ?? 0) / maxFrequency,
        0
      ) / Math.max(words.length, 1);
      const positionBoost = index < Math.max(2, sentences.length * 0.12) ? 0.22 : 0;
      const lengthBalance = sentence.length >= 70 && sentence.length <= 260 ? 0.12 : 0;
      return { sentence, index, score: relevance + positionBoost + lengthBalance };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);
}

function extractSpeakerGroups(text: string) {
  const teacherParts: string[] = [];
  const studentParts: string[] = [];

  text.split(/\n+/).forEach((line) => {
    const trimmed = line.trim();
    const teacher = trimmed.match(/^(profesor(?:a)?|docente|teacher|instructor)\s*[:—-]\s*(.+)$/i);
    const student = trimmed.match(/^(alumnos?|estudiantes?|students?|grupo)\s*[:—-]\s*(.+)$/i);
    if (teacher?.[2]) teacherParts.push(teacher[2]);
    if (student?.[2]) studentParts.push(student[2]);
  });

  return {
    teacher: teacherParts.length ? rankSentences(teacherParts.join(" "), 5) : [],
    students: studentParts.length ? rankSentences(studentParts.join(" "), 5) : [],
  };
}

function buildSummary(rawText: string, filename: string): Summary {
  const text = cleanText(rawText);
  const rawHeadings = rawText
    .split("\n")
    .map((line) => line.match(/^#{1,4}\s+(.+)/)?.[1]?.trim())
    .filter((heading): heading is string => Boolean(heading));
  const firstHeading = rawHeadings[0];
  const firstLine = text.split("\n").find((line) => line.length > 5 && line.length < 110);
  const fallbackTitle = filename.replace(/\.(md|markdown|txt|docx|docs)$/i, "").replace(/[-_]+/g, " ");
  const title = firstHeading ?? firstLine ?? fallbackTitle;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const frequency = new Map<string, number>();
  wordsFrom(text).forEach((word) => frequency.set(word, (frequency.get(word) ?? 0) + 1));
  const keywords = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  const voices = extractSpeakerGroups(rawText);

  return {
    title,
    overview: rankSentences(text, 3),
    keyIdeas: rankSentences(text, 7),
    keywords,
    headings: [...new Set(rawHeadings)].slice(0, 8),
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 220)),
    teacher: voices.teacher,
    students: voices.students,
  };
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "ready">("idle");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [voice, setVoice] = useState<"teacher" | "students">("teacher");

  async function processFile(file?: File) {
    if (!file) return;
    setError("");
    setStatus("reading");
    setDragging(false);

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("El archivo supera el límite de 10 MB.");
      }

      const extension = file.name.split(".").pop()?.toLowerCase();
      let text = "";
      if (extension === "docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value;
      } else if (["md", "markdown", "txt", "docs"].includes(extension ?? "")) {
        text = await file.text();
      } else {
        throw new Error("Formato no compatible. Usa un archivo .docx, .md o .txt.");
      }

      if (cleanText(text).split(/\s+/).length < 35) {
        throw new Error("El documento necesita un poco más de contenido para generar un buen resumen.");
      }

      setFileName(file.name);
      setSummary(buildSummary(text, file.name));
      setStatus("ready");
      window.setTimeout(() => document.getElementById("resumen")?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (problem) {
      setStatus("idle");
      setSummary(null);
      setError(problem instanceof Error ? problem.message : "No se pudo leer el archivo.");
    }
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    processFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    processFile(event.dataTransfer.files?.[0]);
  }

  function reset() {
    setSummary(null);
    setFileName("");
    setStatus("idle");
    setError("");
    setVoice("teacher");
    if (inputRef.current) inputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const hasVoices = Boolean(summary?.teacher.length || summary?.students.length);
  const voicePoints = voice === "teacher" ? summary?.teacher : summary?.students;

  return (
    <main>
      <header className="topbar">
        <button className="brand brandButton" onClick={reset} aria-label="Ir al inicio">
          <span className="brandMark">R</span>
          <span>Resumen</span>
        </button>
        <div className="privacyBadge"><span /> Procesamiento local</div>
      </header>

      <section className={`uploadHero ${summary ? "compact" : ""}`} id="inicio">
        <div className="uploadIntro">
          <p className="eyebrow">Tu documento · Las ideas que importan</p>
          <h1>
            Sube el contenido.
            <span>Quédate con lo esencial.</span>
          </h1>
          <p>
            Convierte apuntes, transcripciones o documentos de cualquier tema en
            un resumen claro, ordenado y fácil de estudiar.
          </p>
        </div>

        <label
          className={`dropzone ${dragging ? "dragging" : ""} ${status === "reading" ? "reading" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".docx,.md,.markdown,.txt,.docs"
            onChange={onInput}
            disabled={status === "reading"}
          />
          <span className="uploadIcon" aria-hidden="true">↑</span>
          {status === "reading" ? (
            <>
              <strong>Analizando el documento…</strong>
              <small>Identificando temas, ideas y estructura</small>
            </>
          ) : (
            <>
              <strong>Arrastra tu archivo aquí</strong>
              <span>o haz clic para seleccionarlo</span>
              <div className="formatPills"><b>DOCX</b><b>MD</b><b>TXT</b><small>Máx. 10 MB</small></div>
            </>
          )}
        </label>

        <p className="privacyNote">
          <span aria-hidden="true">●</span> El archivo se procesa en tu navegador y no se guarda en la página.
        </p>
        {error && <p className="uploadError" role="alert">{error}</p>}
      </section>

      {summary && (
        <div className="results" id="resumen">
          <section className="resultHero">
            <div className="documentMeta">
              <span>Resumen generado</span>
              <button onClick={() => inputRef.current?.click()}>Cambiar documento ↗</button>
            </div>
            <h2>{summary.title}</h2>
            <div className="fileLine">
              <strong>{fileName}</strong>
              <span>{summary.wordCount.toLocaleString("es-MX")} palabras</span>
              <span>{summary.readingMinutes} min de lectura</span>
            </div>
          </section>

          <section className="overviewSection">
            <div className="sectionLabel">01 · Panorama general</div>
            <div className="overviewLayout">
              <h3>En pocas palabras</h3>
              <div className="overviewCopy">
                {summary.overview.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>
          </section>

          <section className="keySection">
            <div className="sectionHeading light">
              <div>
                <p className="eyebrow">02 · Contenido prioritario</p>
                <h2>Ideas clave</h2>
              </div>
              <p>Los fragmentos con mayor relación con los conceptos centrales del documento.</p>
            </div>
            <div className="ideaGrid">
              {summary.keyIdeas.map((idea, index) => (
                <article key={`${idea}-${index}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{idea}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="topicsSection">
            <div>
              <p className="eyebrow">03 · Mapa temático</p>
              <h2>Conceptos recurrentes</h2>
            </div>
            <div className="topicCloud">
              {summary.keywords.map((keyword, index) => (
                <span className={`topic topic${(index % 4) + 1}`} key={keyword}>{keyword}</span>
              ))}
            </div>
          </section>

          {hasVoices && (
            <section className="voicesDetected">
              <div className="sectionHeading">
                <div>
                  <p className="eyebrow">04 · Voces detectadas</p>
                  <h2>Quién dijo qué</h2>
                </div>
                <p>Las intervenciones de estudiantes se agrupan en una sola voz colectiva.</p>
              </div>
              <div className="voiceToggle" role="group" aria-label="Elegir grupo de intervenciones">
                <button className={voice === "teacher" ? "active" : ""} onClick={() => setVoice("teacher")} disabled={!summary.teacher.length} aria-pressed={voice === "teacher"}>
                  <span className="toggleIcon">P</span>Profesor<small>{summary.teacher.length} ideas detectadas</small>
                </button>
                <button className={voice === "students" ? "active" : ""} onClick={() => setVoice("students")} disabled={!summary.students.length} aria-pressed={voice === "students"}>
                  <span className="toggleIcon">A</span>Alumnos · grupo<small>{summary.students.length} ideas detectadas</small>
                </button>
              </div>
              <div className="voiceIdeaList" aria-live="polite">
                {voicePoints?.map((point, index) => (
                  <article key={`${point}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{point}</p></article>
                ))}
              </div>
            </section>
          )}

          {summary.headings.length > 1 && (
            <section className="outlineSection">
              <div>
                <p className="eyebrow">{hasVoices ? "05" : "04"} · Estructura original</p>
                <h2>Recorrido del documento</h2>
              </div>
              <ol>
                {summary.headings.map((heading, index) => (
                  <li key={heading}><span>{String(index + 1).padStart(2, "0")}</span>{heading}</li>
                ))}
              </ol>
            </section>
          )}

          <section className="newDocument">
            <div>
              <p className="eyebrow">¿Otro tema?</p>
              <h2>Crea un resumen nuevo.</h2>
            </div>
            <button className="primaryButton" onClick={reset}>Subir otro documento <span>↑</span></button>
          </section>
        </div>
      )}

      <footer>
        <div className="footerLead">
          <span>RESUMEN AUTOMÁTICO</span>
          <p>Documentos más claros, sin sacar el archivo de tu navegador.</p>
        </div>
        {summary && <button onClick={reset}>Nuevo documento ↑</button>}
      </footer>
    </main>
  );
}
