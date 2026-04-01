# /// script
# requires-python = ">=3.10"
# dependencies = ["phonenumbers", "email-validator"]
# ///
"""Contact Validator — Valida e normaliza telefones (BR/intl) e emails em lote."""
import sys, json
from pathlib import Path

def main():
    args = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    action = args.get('action', '')

    if not action:
        print(json.dumps({"error": "Parâmetro 'action' obrigatório. Ações: validate_phone, validate_email, validate_batch, validate_file"}))
        return

    try:
        if action == 'validate_phone':
            phone = args.get('phone', '')
            country = args.get('country', 'BR')
            if not phone:
                print(json.dumps({"error": "Parâmetro 'phone' é obrigatório"}))
                return
            result = validate_single_phone(phone, country)
            print(json.dumps(result))
            return

        if action == 'validate_email':
            email = args.get('email', '')
            if not email:
                print(json.dumps({"error": "Parâmetro 'email' é obrigatório"}))
                return
            result = validate_single_email(email)
            print(json.dumps(result))
            return

        if action == 'validate_batch':
            phones = args.get('phones', [])
            emails = args.get('emails', [])
            country = args.get('country', 'BR')
            results = {"success": True}

            if phones:
                phone_results = [validate_single_phone(p, country) for p in phones]
                valid_count = sum(1 for r in phone_results if r.get('valid'))
                results["phones"] = {
                    "total": len(phones),
                    "valid": valid_count,
                    "invalid": len(phones) - valid_count,
                    "results": phone_results
                }

            if emails:
                email_results = [validate_single_email(e) for e in emails]
                valid_count = sum(1 for r in email_results if r.get('valid'))
                results["emails"] = {
                    "total": len(emails),
                    "valid": valid_count,
                    "invalid": len(emails) - valid_count,
                    "results": email_results
                }

            print(json.dumps(results))
            return

        if action == 'validate_file':
            input_path = args.get('input', '')
            phone_column = args.get('phone_column', '')
            email_column = args.get('email_column', '')
            output_path = args.get('output', '')
            country = args.get('country', 'BR')

            if not input_path:
                print(json.dumps({"error": "Parâmetro 'input' (CSV/Excel) é obrigatório"}))
                return

            p = Path(input_path).expanduser().resolve()
            if not p.exists():
                print(json.dumps({"error": f"Arquivo não encontrado: {p}"}))
                return

            try:
                import pandas as pd
            except ImportError:
                print(json.dumps({"error": "pandas necessário para validate_file. Instale: pip install pandas openpyxl"}))
                return

            ext = p.suffix.lower()
            if ext == '.csv':
                df = pd.read_csv(str(p), encoding='utf-8')
            elif ext in ('.xlsx', '.xls'):
                df = pd.read_excel(str(p))
            else:
                print(json.dumps({"error": f"Formato não suportado: {ext}. Use CSV ou Excel."}))
                return

            stats = {"total_rows": len(df)}

            if phone_column and phone_column in df.columns:
                df[f'{phone_column}_valid'] = False
                df[f'{phone_column}_normalized'] = ''
                df[f'{phone_column}_type'] = ''
                for idx, row in df.iterrows():
                    val = str(row[phone_column]) if pd.notna(row[phone_column]) else ''
                    if val:
                        result = validate_single_phone(val, country)
                        df.at[idx, f'{phone_column}_valid'] = result.get('valid', False)
                        df.at[idx, f'{phone_column}_normalized'] = result.get('formatted_e164', '')
                        df.at[idx, f'{phone_column}_type'] = result.get('type', '')
                valid = df[f'{phone_column}_valid'].sum()
                stats["phones"] = {"valid": int(valid), "invalid": int(len(df) - valid)}

            if email_column and email_column in df.columns:
                df[f'{email_column}_valid'] = False
                df[f'{email_column}_normalized'] = ''
                for idx, row in df.iterrows():
                    val = str(row[email_column]) if pd.notna(row[email_column]) else ''
                    if val:
                        result = validate_single_email(val)
                        df.at[idx, f'{email_column}_valid'] = result.get('valid', False)
                        df.at[idx, f'{email_column}_normalized'] = result.get('normalized', '')
                valid = df[f'{email_column}_valid'].sum()
                stats["emails"] = {"valid": int(valid), "invalid": int(len(df) - valid)}

            if output_path:
                out = Path(output_path).expanduser().resolve()
                out_ext = out.suffix.lower()
                if out_ext == '.csv':
                    df.to_csv(str(out), index=False, encoding='utf-8')
                elif out_ext in ('.xlsx', '.xls'):
                    df.to_excel(str(out), index=False)
                stats["output"] = str(out)

            print(json.dumps({"success": True, **stats}))
            return

        print(json.dumps({"error": f"Ação '{action}' não reconhecida"}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))


def validate_single_phone(phone, country='BR'):
    """Valida um único telefone."""
    import phonenumbers
    import re

    original = str(phone).strip()
    cleaned = re.sub(r'[^\d+]', '', original)

    # Adicionar +55 se parece ser BR sem prefixo
    if not cleaned.startswith('+') and country == 'BR':
        if len(cleaned) >= 10 and not cleaned.startswith('55'):
            cleaned = '55' + cleaned
        cleaned = '+' + cleaned
    elif not cleaned.startswith('+'):
        cleaned = '+' + cleaned

    try:
        parsed = phonenumbers.parse(cleaned, country)
        is_valid = phonenumbers.is_valid_number(parsed)
        number_type = phonenumbers.number_type(parsed)
        type_map = {0: 'fixo', 1: 'móvel', 2: 'fixo_ou_móvel', 3: 'toll_free', 4: 'premium', 5: 'shared_cost', 6: 'voip', 7: 'personal', 9: 'uan', 10: 'voicemail'}

        return {
            "original": original,
            "valid": is_valid,
            "formatted_e164": phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164) if is_valid else '',
            "formatted_national": phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL) if is_valid else '',
            "formatted_international": phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL) if is_valid else '',
            "country_code": parsed.country_code,
            "type": type_map.get(number_type, 'desconhecido'),
            "region": phonenumbers.region_code_for_number(parsed) or '',
            "is_whatsapp_format": is_valid and cleaned.startswith('+55') and len(re.sub(r'\D', '', cleaned)) == 13
        }
    except Exception as e:
        return {"original": original, "valid": False, "error": str(e)}


def validate_single_email(email):
    """Valida um único email."""
    from email_validator import validate_email, EmailNotValidError

    original = str(email).strip()

    try:
        result = validate_email(original, check_deliverability=False)
        return {
            "original": original,
            "valid": True,
            "normalized": result.normalized,
            "local_part": result.local_part,
            "domain": result.domain,
            "is_disposable": any(d in result.domain for d in ['tempmail', 'guerrillamail', 'mailinator', 'yopmail', 'throwaway', 'sharklasers']),
        }
    except EmailNotValidError as e:
        return {"original": original, "valid": False, "error": str(e)}


if __name__ == '__main__':
    main()
