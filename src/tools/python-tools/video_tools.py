# /// script
# requires-python = ">=3.10"
# dependencies = ["ffmpeg-python"]
# ///
"""Video Tools — Cortar, comprimir, converter, extrair frames e watermark via ffmpeg."""
import sys, json, os, subprocess
from pathlib import Path

def find_ffmpeg():
    """Procura ffmpeg no sistema."""
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            return 'ffmpeg'
    except FileNotFoundError:
        pass
    # Tentar caminhos comuns no Windows
    for p in [r'C:\ffmpeg\bin\ffmpeg.exe', r'C:\ProgramData\chocolatey\bin\ffmpeg.exe']:
        if Path(p).exists():
            return p
    return None

def get_info(input_path):
    """Retorna info do vídeo via ffprobe."""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', str(input_path)],
            capture_output=True, text=True, timeout=30
        )
        return json.loads(result.stdout)
    except Exception:
        return {}

def main():
    args = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    action = args.get('action', '')
    input_path = args.get('input', '')
    output_path = args.get('output', '')

    if not action:
        print(json.dumps({"error": "Parâmetro 'action' obrigatório. Ações: info, compress, convert, cut, extract_frames, watermark, audio_extract, thumbnail"}))
        return

    ffmpeg = find_ffmpeg()
    if not ffmpeg and action != 'info':
        print(json.dumps({"error": "ffmpeg não encontrado. Instale: winget install ffmpeg / choco install ffmpeg"}))
        return

    if not input_path and action != 'info':
        print(json.dumps({"error": "Parâmetro 'input' é obrigatório"}))
        return

    p = Path(input_path).expanduser().resolve() if input_path else None
    if p and not p.exists():
        print(json.dumps({"error": f"Arquivo não encontrado: {p}"}))
        return

    try:
        import ffmpeg as ff

        if action == 'info':
            if not p:
                print(json.dumps({"error": "Parâmetro 'input' é obrigatório"}))
                return
            info = get_info(p)
            if not info:
                print(json.dumps({"error": "Não foi possível ler info do vídeo"}))
                return
            fmt = info.get('format', {})
            streams = info.get('streams', [])
            video_stream = next((s for s in streams if s.get('codec_type') == 'video'), {})
            audio_stream = next((s for s in streams if s.get('codec_type') == 'audio'), {})
            result = {
                "success": True,
                "file": str(p),
                "duration": float(fmt.get('duration', 0)),
                "size_mb": round(int(fmt.get('size', 0)) / 1048576, 2),
                "bitrate_kbps": round(int(fmt.get('bit_rate', 0)) / 1000),
                "format": fmt.get('format_name', ''),
                "video": {
                    "codec": video_stream.get('codec_name', ''),
                    "width": video_stream.get('width', 0),
                    "height": video_stream.get('height', 0),
                    "fps": eval(video_stream.get('r_frame_rate', '0/1')) if '/' in str(video_stream.get('r_frame_rate', '0')) else float(video_stream.get('r_frame_rate', 0)),
                },
                "audio": {
                    "codec": audio_stream.get('codec_name', ''),
                    "sample_rate": audio_stream.get('sample_rate', ''),
                    "channels": audio_stream.get('channels', 0),
                } if audio_stream else None
            }
            print(json.dumps(result))
            return

        if action == 'compress':
            quality = args.get('quality', 'medium')  # low, medium, high
            crf_map = {'low': 32, 'medium': 26, 'high': 20}
            crf = crf_map.get(quality, 26)
            out = Path(output_path).expanduser().resolve() if output_path else p.with_stem(p.stem + '-compressed')
            (
                ff.input(str(p))
                .output(str(out), vcodec='libx264', crf=crf, preset='medium', acodec='aac', audio_bitrate='128k')
                .overwrite_output()
                .run(quiet=True)
            )
            orig_size = p.stat().st_size
            new_size = out.stat().st_size
            print(json.dumps({"success": True, "output": str(out), "original_mb": round(orig_size/1048576, 2), "compressed_mb": round(new_size/1048576, 2), "reduction": f"{round((1-new_size/orig_size)*100, 1)}%"}))
            return

        if action == 'convert':
            fmt = args.get('format', 'mp4')
            out = Path(output_path).expanduser().resolve() if output_path else p.with_suffix(f'.{fmt}')
            (
                ff.input(str(p))
                .output(str(out))
                .overwrite_output()
                .run(quiet=True)
            )
            print(json.dumps({"success": True, "output": str(out), "format": fmt}))
            return

        if action == 'cut':
            start = args.get('start', '00:00:00')
            duration = args.get('duration', '')
            end = args.get('end', '')
            out = Path(output_path).expanduser().resolve() if output_path else p.with_stem(p.stem + '-cut')
            inp = ff.input(str(p), ss=start)
            if duration:
                inp = ff.input(str(p), ss=start, t=duration)
            elif end:
                inp = ff.input(str(p), ss=start, to=end)
            inp.output(str(out), codec='copy').overwrite_output().run(quiet=True)
            print(json.dumps({"success": True, "output": str(out), "start": start, "duration": duration or "até o fim"}))
            return

        if action == 'extract_frames':
            interval = args.get('interval', 1)  # 1 frame por segundo
            out_dir = Path(output_path).expanduser().resolve() if output_path else p.parent / f'{p.stem}-frames'
            out_dir.mkdir(parents=True, exist_ok=True)
            (
                ff.input(str(p))
                .filter('fps', fps=1/interval)
                .output(str(out_dir / 'frame_%04d.png'))
                .overwrite_output()
                .run(quiet=True)
            )
            frames = list(out_dir.glob('frame_*.png'))
            print(json.dumps({"success": True, "output_dir": str(out_dir), "frames": len(frames), "interval": f"1 frame a cada {interval}s"}))
            return

        if action == 'watermark':
            watermark = args.get('watermark', '')
            position = args.get('position', 'bottomright')  # topleft, topright, bottomleft, bottomright, center
            if not watermark:
                print(json.dumps({"error": "Parâmetro 'watermark' (caminho da imagem) é obrigatório"}))
                return
            wm = Path(watermark).expanduser().resolve()
            if not wm.exists():
                print(json.dumps({"error": f"Watermark não encontrado: {wm}"}))
                return
            pos_map = {
                'topleft': 'x=10:y=10',
                'topright': 'x=W-w-10:y=10',
                'bottomleft': 'x=10:y=H-h-10',
                'bottomright': 'x=W-w-10:y=H-h-10',
                'center': 'x=(W-w)/2:y=(H-h)/2',
            }
            overlay_pos = pos_map.get(position, pos_map['bottomright'])
            out = Path(output_path).expanduser().resolve() if output_path else p.with_stem(p.stem + '-watermarked')
            main_input = ff.input(str(p))
            wm_input = ff.input(str(wm))
            (
                ff.filter([main_input, wm_input], 'overlay', **dict(item.split('=') for item in overlay_pos.split(':')))
                .output(str(out), acodec='copy')
                .overwrite_output()
                .run(quiet=True)
            )
            print(json.dumps({"success": True, "output": str(out), "watermark": str(wm), "position": position}))
            return

        if action == 'audio_extract':
            fmt = args.get('format', 'mp3')
            out = Path(output_path).expanduser().resolve() if output_path else p.with_suffix(f'.{fmt}')
            (
                ff.input(str(p))
                .output(str(out), vn=None, acodec={'mp3': 'libmp3lame', 'aac': 'aac', 'wav': 'pcm_s16le'}.get(fmt, 'libmp3lame'))
                .overwrite_output()
                .run(quiet=True)
            )
            print(json.dumps({"success": True, "output": str(out), "format": fmt}))
            return

        if action == 'thumbnail':
            time = args.get('time', '00:00:01')
            out = Path(output_path).expanduser().resolve() if output_path else p.with_suffix('.jpg')
            (
                ff.input(str(p), ss=time)
                .filter('scale', 640, -1)
                .output(str(out), vframes=1)
                .overwrite_output()
                .run(quiet=True)
            )
            print(json.dumps({"success": True, "output": str(out), "time": time}))
            return

        print(json.dumps({"error": f"Ação '{action}' não reconhecida"}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == '__main__':
    main()
