from flask import Flask, render_template, request, jsonify
from google.cloud import storage
import json
import os

app = Flask(__name__)
blob = storage.Client().bucket('kkangshawn-aptdata').blob('data.json')

# 차트 데이터를 로컬에 캐시하기 위한 파일
CHART_DATA_FILE = 'chart_data.json'

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/save', methods=['POST'])
def save_data():
    try:
        data = request.get_json()
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

    # Process the data and save it to the blob
    try:
        blob.upload_from_string(
            data=json.dumps(data, ensure_ascii=False),
            content_type='application/json'
            )
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/load', methods=['GET'])
def load_data():
    try:
        content = blob.download_as_text()
        return jsonify(json.loads(content)), 200
    except Exception as e:
        return jsonify({}), 404

@app.route('/api/chart-data', methods=['GET'])
def get_chart_data():
    try:
        import time
        from flask import request

        refresh = request.args.get('refresh', 'false').lower() == 'true'

        # 캐시 파일이 있고, 수정된 지 1시간 이내면 캐시 사용 (강제 갱신이 아닌 경우)
        if not refresh and os.path.exists(CHART_DATA_FILE):
            file_age = time.time() - os.path.getmtime(CHART_DATA_FILE)
            if file_age < 3600:  # 1시간 = 3600초
                with open(CHART_DATA_FILE, 'r', encoding='utf-8') as f:
                    return jsonify(json.load(f)), 200

        # GCS에서 데이터를 가져와서 로컬에 캐시
        chart_blob = storage.Client().bucket('kkangshawn-aptdata').blob('trade_info.json')
        content = chart_blob.download_as_text()
        data = json.loads(content)

        # 로컬에 저장
        with open(CHART_DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=True, host='0.0.0.0', port=port)