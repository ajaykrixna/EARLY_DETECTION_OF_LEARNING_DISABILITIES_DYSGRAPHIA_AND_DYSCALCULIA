import zipfile, shutil

model_path = 'models/final_best_model_full_finetuned.keras'
fixed_path = 'models/fixed_model.keras'

with zipfile.ZipFile(model_path, 'r') as zin:
    with zipfile.ZipFile(fixed_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == 'config.json':
                config_str = data.decode('utf-8')
                config_str = config_str.replace('"batch_shape"', '"batch_input_shape"')
                data = config_str.encode('utf-8')
            zout.writestr(item, data)

print('Done! fixed_model.keras created.')