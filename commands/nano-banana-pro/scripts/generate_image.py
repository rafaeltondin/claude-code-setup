#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "pillow>=10.0.0",
# ]
# ///
"""
Gera e edita imagens usando a API Google Nano Banana Pro (Gemini 3 Pro Image).

Uso:
    uv run generate_image.py --prompt "descrição da imagem" --filename "saida.png" [--resolution 1K|2K|4K] [--api-key CHAVE]
    uv run generate_image.py --prompt "instrução de edição" --filename "saida.png" --input-image "entrada.png" [--resolution 1K|2K|4K]
"""

import argparse
import os
import sys
from pathlib import Path


def obter_api_key(chave_fornecida: str | None) -> str | None:
    """Busca a API key: primeiro no argumento, depois na variável de ambiente."""
    if chave_fornecida:
        return chave_fornecida
    return os.environ.get("GEMINI_API_KEY")


def main():
    parser = argparse.ArgumentParser(
        description="Gera e edita imagens com Nano Banana Pro (Gemini 3 Pro Image)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  Gerar: uv run generate_image.py -p "pôr do sol sobre o mar" -f "por-do-sol.png"
  Editar: uv run generate_image.py -p "mude para estilo aquarela" -f "editada.png" -i "original.png" -r 2K
  Alta resolução: uv run generate_image.py -p "cidade futurista" -f "cidade-4k.png" -r 4K
        """
    )
    parser.add_argument(
        "--prompt", "-p",
        required=True,
        help="Descrição da imagem a gerar ou instrução de edição"
    )
    parser.add_argument(
        "--filename", "-f",
        required=True,
        help="Nome do arquivo de saída (ex: minha-imagem.png)"
    )
    parser.add_argument(
        "--input-image", "-i",
        help="Caminho da imagem de entrada para edição/modificação (opcional)"
    )
    parser.add_argument(
        "--resolution", "-r",
        choices=["1K", "2K", "4K"],
        default="1K",
        help="Resolução de saída: 1K (padrão/rascunho), 2K (intermediário), 4K (final)"
    )
    parser.add_argument(
        "--api-key", "-k",
        help="Chave da API Gemini (substitui a variável de ambiente GEMINI_API_KEY)"
    )

    args = parser.parse_args()

    # Buscar API key
    api_key = obter_api_key(args.api_key)
    if not api_key:
        print("Erro: Nenhuma API key fornecida.", file=sys.stderr)
        print("Opções:", file=sys.stderr)
        print("  1. Forneça --api-key CHAVE", file=sys.stderr)
        print("  2. Defina a variável GEMINI_API_KEY no ambiente", file=sys.stderr)
        print("  3. Use o Credential Vault: node ~/.claude/task-scheduler/credential-cli.js get GEMINI_API_KEY", file=sys.stderr)
        sys.exit(1)

    # Importar após verificar a chave (evita importação lenta em caso de erro)
    from google import genai
    from google.genai import types
    from PIL import Image as PILImage

    # Inicializar cliente
    client = genai.Client(api_key=api_key)

    # Configurar caminho de saída
    caminho_saida = Path(args.filename)
    caminho_saida.parent.mkdir(parents=True, exist_ok=True)

    # Carregar imagem de entrada se fornecida
    imagem_entrada = None
    resolucao_saida = args.resolution

    if args.input_image:
        try:
            imagem_entrada = PILImage.open(args.input_image)
            print(f"Imagem de entrada carregada: {args.input_image}")

            # Auto-detectar resolução se não foi definida explicitamente
            if args.resolution == "1K":  # Valor padrão
                largura, altura = imagem_entrada.size
                dim_max = max(largura, altura)
                if dim_max >= 3000:
                    resolucao_saida = "4K"
                elif dim_max >= 1500:
                    resolucao_saida = "2K"
                else:
                    resolucao_saida = "1K"
                print(f"Resolução auto-detectada: {resolucao_saida} (imagem original: {largura}x{altura}px)")
        except Exception as e:
            print(f"Erro ao carregar imagem de entrada: {e}", file=sys.stderr)
            sys.exit(1)

    # Construir conteúdo da requisição
    if imagem_entrada:
        conteudo = [imagem_entrada, args.prompt]
        print(f"Editando imagem com resolução {resolucao_saida}...")
    else:
        conteudo = args.prompt
        print(f"Gerando imagem com resolução {resolucao_saida}...")

    try:
        resposta = client.models.generate_content(
            model="nano-banana-pro-preview",
            contents=conteudo,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"]
            )
        )

        # Processar resposta e salvar como PNG
        imagem_salva = False
        for parte in resposta.parts:
            if parte.text is not None:
                print(f"Resposta do modelo: {parte.text}")
            elif parte.inline_data is not None:
                from io import BytesIO

                dados_imagem = parte.inline_data.data
                if isinstance(dados_imagem, str):
                    import base64
                    dados_imagem = base64.b64decode(dados_imagem)

                imagem = PILImage.open(BytesIO(dados_imagem))

                # Garantir modo RGB para PNG (converter RGBA para RGB se necessário)
                if imagem.mode == "RGBA":
                    imagem_rgb = PILImage.new("RGB", imagem.size, (255, 255, 255))
                    imagem_rgb.paste(imagem, mask=imagem.split()[3])
                    imagem_rgb.save(str(caminho_saida), "PNG")
                elif imagem.mode == "RGB":
                    imagem.save(str(caminho_saida), "PNG")
                else:
                    imagem.convert("RGB").save(str(caminho_saida), "PNG")

                imagem_salva = True

        if imagem_salva:
            caminho_completo = caminho_saida.resolve()
            print(f"\nImagem salva em: {caminho_completo}")
        else:
            print("Erro: Nenhuma imagem foi gerada na resposta.", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"Erro ao gerar imagem: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
