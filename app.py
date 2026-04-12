from flask import Flask, render_template, request, jsonify
from google.cloud import storage
import json

app = Flask(__name__)
blob = storage.Client().bucket('kkangshawn-aptdata').blob('data.json')

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

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=True, host='0.0.0.0', port=port)