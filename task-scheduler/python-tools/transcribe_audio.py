# /// script
# requires-python = ">=3.10"
# dependencies = ["faster-whisper"]
# ///
"""Transcribe Audio — Transcreve áudio para texto usando faster-whisper (Whisper small, int8, CPU)."""
import sys, json, os, time
from pathlib import Path


def main():
    args = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    input_path = args.get('input', '')
    language = args.get('language', 'pt')
    model_size = args.get('model', 'small')
    output_format = args.get('format', 'text')
    output_file = args.get('output', '')
    beam_size = int(args.get('beam_size', 5))
    vad = args.get('vad', 'true').lower() in ('true', '1', 'yes')

    if not input_path:
        print(json.dumps({"error": "Parâmetro 'input' é obrigatório"}, ensure_ascii=False))
        return

    p = Path(input_path).expanduser().resolve()
    if not p.exists():
        print(json.dumps({"error": f"Arquivo não encontrado: {p}"}, ensure_ascii=False))
        return

    supported = {'.mp3', '.wav', '.ogg', '.oga', '.m4a', '.flac', '.wma', '.aac', '.opus', '.webm', '.mp4'}
    if p.suffix.lower() not in supported:
        print(json.dumps({"error": f"Formato não suportado: {p.suffix}. Suportados: {', '.join(sorted(supported))}"}, ensure_ascii=False))
        return

    try:
        from faster_whisper import WhisperModel

        t0 = time.time()
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        load_time = time.time() - t0

        vad_params = dict(
            min_silence_duration_ms=500,
            speech_pad_ms=300,
        ) if vad else None

        t1 = time.time()
        segments_gen, info = model.transcribe(
            str(p),
            language=language if language != 'auto' else None,
            beam_size=beam_size,
            vad_filter=vad,
            vad_parameters=vad_params,
        )

        segments = []
        for seg in segments_gen:
            segments.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
            })

        transcribe_time = time.time() - t1
        full_text = " ".join(s["text"] for s in segments).strip()
        duration = info.duration or 0
        rtf = transcribe_time / max(duration, 0.1)

        result = {
            "text": full_text,
            "language": info.language,
            "language_probability": round(info.language_probability, 4),
            "duration_seconds": round(duration, 1),
            "segments": segments,
            "model": model_size,
            "compute_type": "int8",
            "device": "cpu",
            "model_load_time": round(load_time, 1),
            "transcribe_time": round(transcribe_time, 1),
            "rtf": round(rtf, 3),
            "file": str(p),
            "file_size_kb": round(p.stat().st_size / 1024, 1),
        }

        # Salvar em arquivo se solicitado
        if output_file:
            out_p = Path(output_file).expanduser().resolve()
            if output_format == 'srt':
                srt_content = generate_srt(segments)
                out_p.write_text(srt_content, encoding='utf-8')
                result["output_file"] = str(out_p)
            elif output_format == 'vtt':
                vtt_content = generate_vtt(segments)
                out_p.write_text(vtt_content, encoding='utf-8')
                result["output_file"] = str(out_p)
            else:
                out_p.write_text(full_text, encoding='utf-8')
                result["output_file"] = str(out_p)

        print(json.dumps(result, ensure_ascii=False))

    except ImportError:
        print(json.dumps({
            "error": "faster-whisper não instalado. Execute: pip install faster-whisper",
            "install_cmd": "pip install faster-whisper"
        }, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": f"Erro na transcrição: {str(e)}"}, ensure_ascii=False))


def generate_srt(segments):
    lines = []
    for i, seg in enumerate(segments, 1):
        start = format_timestamp_srt(seg["start"])
        end = format_timestamp_srt(seg["end"])
        lines.append(f"{i}\n{start} --> {end}\n{seg['text']}\n")
    return "\n".join(lines)


def generate_vtt(segments):
    lines = ["WEBVTT\n"]
    for seg in segments:
        start = format_timestamp_vtt(seg["start"])
        end = format_timestamp_vtt(seg["end"])
        lines.append(f"{start} --> {end}\n{seg['text']}\n")
    return "\n".join(lines)


def format_timestamp_srt(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def format_timestamp_vtt(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


if __name__ == '__main__':
    main()
