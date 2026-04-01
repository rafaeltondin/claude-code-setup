# /// script
# requires-python = ">=3.10"
# dependencies = ["pandas", "openpyxl"]
# ///
"""Data Transform — ETL entre formatos: CSV, Excel, JSON. Normaliza, filtra, converte."""
import sys, json, os
from pathlib import Path

def main():
    args = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    action = args.get('action', '')
    input_path = args.get('input', '')
    output_path = args.get('output', '')
    columns = args.get('columns', '')
    filter_expr = args.get('filter', '')
    sort_by = args.get('sort', '')
    rename = args.get('rename', {})
    limit = args.get('limit', 0)
    sheet = args.get('sheet', 0)
    separator = args.get('separator', ',')

    if not action:
        print(json.dumps({"error": "Parâmetro 'action' é obrigatório. Ações: convert, stats, preview, filter, merge, normalize_phones, normalize_emails, deduplicate"}))
        return

    import pandas as pd

    try:
        if action == 'normalize_phones':
            data = args.get('data', [])
            if not data:
                print(json.dumps({"error": "Parâmetro 'data' (lista de telefones) é obrigatório"}))
                return
            import re
            results = []
            for phone in data:
                cleaned = re.sub(r'[^\d+]', '', str(phone))
                if cleaned.startswith('+'):
                    normalized = cleaned
                elif len(cleaned) >= 10:
                    if not cleaned.startswith('55'):
                        cleaned = '55' + cleaned
                    normalized = '+' + cleaned
                else:
                    normalized = cleaned
                results.append({"original": str(phone), "normalized": normalized, "valid": len(re.sub(r'\D', '', normalized)) >= 12})
            print(json.dumps({"success": True, "count": len(results), "results": results}))
            return

        if action == 'normalize_emails':
            data = args.get('data', [])
            if not data:
                print(json.dumps({"error": "Parâmetro 'data' (lista de emails) é obrigatório"}))
                return
            import re
            email_re = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
            results = []
            for email in data:
                e = str(email).strip().lower()
                results.append({"original": str(email), "normalized": e, "valid": bool(email_re.match(e))})
            print(json.dumps({"success": True, "count": len(results), "results": results}))
            return

        # Ações que precisam de arquivo de entrada
        if not input_path:
            print(json.dumps({"error": "Parâmetro 'input' é obrigatório para esta ação"}))
            return

        p = Path(input_path).expanduser().resolve()
        if not p.exists():
            print(json.dumps({"error": f"Arquivo não encontrado: {p}"}))
            return

        # Ler arquivo
        ext = p.suffix.lower()
        if ext == '.csv' or ext == '.tsv':
            sep = '\t' if ext == '.tsv' else separator
            df = pd.read_csv(str(p), sep=sep, encoding='utf-8')
        elif ext in ('.xlsx', '.xls'):
            df = pd.read_excel(str(p), sheet_name=sheet)
        elif ext == '.json':
            df = pd.read_json(str(p), encoding='utf-8')
        else:
            print(json.dumps({"error": f"Formato não suportado: {ext}. Use: csv, tsv, xlsx, xls, json"}))
            return

        # Aplicar rename
        if rename and isinstance(rename, dict):
            df = df.rename(columns=rename)

        # Aplicar filtro
        if filter_expr:
            df = df.query(filter_expr)

        # Selecionar colunas
        if columns:
            cols = [c.strip() for c in columns.split(',')]
            df = df[[c for c in cols if c in df.columns]]

        # Ordenar
        if sort_by:
            ascending = True
            col = sort_by
            if sort_by.startswith('-'):
                ascending = False
                col = sort_by[1:]
            if col in df.columns:
                df = df.sort_values(by=col, ascending=ascending)

        # Limitar linhas
        if limit > 0:
            df = df.head(limit)

        if action == 'preview':
            print(json.dumps({"success": True, "rows": len(df), "columns": list(df.columns), "dtypes": {c: str(t) for c, t in df.dtypes.items()}, "preview": df.head(20).to_dict(orient='records')}, default=str))
            return

        if action == 'stats':
            desc = df.describe(include='all').to_dict()
            print(json.dumps({"success": True, "rows": len(df), "columns": list(df.columns), "dtypes": {c: str(t) for c, t in df.dtypes.items()}, "null_counts": df.isnull().sum().to_dict(), "stats": desc}, default=str))
            return

        if action == 'deduplicate':
            subset = [c.strip() for c in columns.split(',')] if columns else None
            before = len(df)
            df = df.drop_duplicates(subset=subset)
            after = len(df)
            if not output_path:
                print(json.dumps({"success": True, "before": before, "after": after, "removed": before - after}))
                return

        if action == 'convert' or action == 'filter' or action == 'deduplicate' or action == 'merge':
            if not output_path:
                # Sem output, retorna preview
                print(json.dumps({"success": True, "rows": len(df), "columns": list(df.columns), "preview": df.head(10).to_dict(orient='records')}, default=str))
                return

            out = Path(output_path).expanduser().resolve()
            out_ext = out.suffix.lower()

            if out_ext == '.csv':
                df.to_csv(str(out), index=False, encoding='utf-8')
            elif out_ext == '.tsv':
                df.to_csv(str(out), index=False, sep='\t', encoding='utf-8')
            elif out_ext in ('.xlsx', '.xls'):
                df.to_excel(str(out), index=False)
            elif out_ext == '.json':
                df.to_json(str(out), orient='records', force_ascii=False, indent=2)
            else:
                print(json.dumps({"error": f"Formato de saída não suportado: {out_ext}"}))
                return

            print(json.dumps({"success": True, "output": str(out), "rows": len(df), "columns": list(df.columns)}))
            return

        print(json.dumps({"error": f"Ação '{action}' não reconhecida"}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == '__main__':
    main()
