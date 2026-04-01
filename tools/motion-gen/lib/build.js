'use strict';
/**
 * motion-gen — Build (áudio timed + merge final)
 *
 * v2: Cada narração é posicionada no timestamp exato do take (T.tNs),
 *     garantindo sincronia perfeita entre áudio e animação visual.
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

/**
 * Concatena MP3s com timing correto e faz merge com o vídeo raw.
 *
 * @param {string[]} mp3Files        Array de caminhos dos MP3s (em ordem)
 * @param {string}   rawVideo        Vídeo sem áudio
 * @param {string}   outputFile      Saída final .mp4
 * @param {number}   [padding]       (legacy, ignorado se T fornecido)
 * @param {object}   [T]             Timing constants (t1s,t1e,t2s,...,total)
 * @param {object[]} [takes]         Array de takes [{id:'n01',...},...]
 * @param {object}   [durations]     Map de durações reais {n01:0.88,...}
 * @returns {string} outputFile
 */
function buildFinal(mp3Files, rawVideo, outputFile, padding = 0, T = null, takes = null, durations = null) {
  const tmpDir   = path.dirname(outputFile);
  const narrFile = path.join(tmpDir, '_narrations.mp3');

  // ── Build com timing preciso (v2) ──────────────────────────────────────
  if (T && takes && durations) {
    console.log(`\n[build] Posicionando ${mp3Files.length} narrações com timing preciso...`);

    const concatList = path.join(tmpDir, '_narr_concat_list.txt');
    const lines = [];
    const tmpFiles = [];

    for (let i = 0; i < takes.length; i++) {
      const take = takes[i];
      const num = parseInt(take.id.replace(/\D/g, ''), 10);
      // Usar aNs (audio start) — posição real do áudio na timeline
      // Fallback para tNs se aNs não existir (compatibilidade)
      const audioStart = T[`a${num}s`] !== undefined ? T[`a${num}s`] : T[`t${num}s`];
      const actualDur = durations[take.id];

      // Calcular quanto tempo de silêncio adicionar após esta narração
      // para que a próxima narração comece em a(N+1)s
      let targetDur;
      if (i < takes.length - 1) {
        const nextNum = parseInt(takes[i + 1].id.replace(/\D/g, ''), 10);
        const nextAudioStart = T[`a${nextNum}s`] !== undefined ? T[`a${nextNum}s`] : T[`t${nextNum}s`];
        targetDur = nextAudioStart - audioStart;
      } else {
        // Último take: duração até o fim do vídeo
        targetDur = T.total - audioStart;
      }
      const tStart = audioStart;

      const silenceAfter = Math.max(0, targetDur - actualDur);

      if (silenceAfter > 0.05) {
        // Criar MP3 paddado com silêncio no final
        const paddedFile = path.join(tmpDir, `_${take.id}_timed.mp3`);
        execSync(
          `ffmpeg -y -i "${mp3Files[i]}" -af "apad=pad_dur=${silenceAfter.toFixed(4)}" -t ${targetDur.toFixed(4)} -b:a 192k "${paddedFile}"`,
          { stdio: 'pipe' }
        );
        lines.push(`file '${paddedFile.replace(/\\/g, '/')}'`);
        tmpFiles.push(paddedFile);
        console.log(`  ${take.id}: ${actualDur.toFixed(2)}s áudio + ${silenceAfter.toFixed(2)}s silêncio = ${targetDur.toFixed(2)}s (início: ${tStart.toFixed(2)}s)`);
      } else {
        lines.push(`file '${mp3Files[i].replace(/\\/g, '/')}'`);
        console.log(`  ${take.id}: ${actualDur.toFixed(2)}s áudio (início: ${tStart.toFixed(2)}s)`);
      }
    }

    fs.writeFileSync(concatList, lines.join('\n'), 'utf8');

    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:a libmp3lame -b:a 192k "${narrFile}"`,
      { stdio: 'pipe' }
    );

    // Limpar temporários
    fs.unlinkSync(concatList);
    tmpFiles.forEach(f => { try { fs.unlinkSync(f); } catch(e) {} });

    console.log(`[build] Áudio sincronizado OK (${T.total.toFixed(2)}s)`);

  } else {
    // ── Build legacy (concatenação simples) ────────────────────────────────
    console.log(`\n[build] Concatenando ${mp3Files.length} narrações${padding > 0 ? ` (com ${padding}s de gap)` : ''}...`);

    const concatList = path.join(tmpDir, '_narr_concat_list.txt');
    const silenceFile = path.join(tmpDir, '_silence.mp3');

    if (padding > 0) {
      execSync(
        `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${padding} -b:a 192k "${silenceFile}"`,
        { stdio: 'pipe' }
      );
    }

    const lines = [];
    mp3Files.forEach((f, i) => {
      lines.push(`file '${f.replace(/\\/g, '/')}'`);
      if (padding > 0 && i < mp3Files.length - 1) {
        lines.push(`file '${silenceFile.replace(/\\/g, '/')}'`);
      }
    });
    fs.writeFileSync(concatList, lines.join('\n'), 'utf8');

    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${narrFile}"`,
      { stdio: 'pipe' }
    );

    fs.unlinkSync(concatList);
    try { fs.unlinkSync(silenceFile); } catch(e) {}
    console.log(`[build] Áudio concatenado OK`);
  }

  // ── Merge vídeo + áudio ──────────────────────────────────────────────────
  console.log(`[build] Merge final: vídeo + áudio...`);

  execSync(
    `ffmpeg -y -i "${rawVideo}" -i "${narrFile}" ` +
    `-c:v copy -c:a aac -b:a 192k -shortest "${outputFile}"`,
    { stdio: 'pipe' }
  );

  try { fs.unlinkSync(narrFile); } catch(e) {}

  const stat = fs.statSync(outputFile);
  console.log(`[build] Vídeo final: ${outputFile}`);
  console.log(`[build] Tamanho: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);

  return outputFile;
}

module.exports = { buildFinal };
