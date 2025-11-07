from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

# Fuzzy logic setup
# Antecedents (Inputs)
pain_level = ctrl.Antecedent(np.arange(0, 11, 1), 'pain_level')
breathing_difficulty = ctrl.Antecedent(np.arange(0, 11, 1), 'breathing_difficulty')
consciousness_level = ctrl.Antecedent(np.arange(0, 11, 1), 'consciousness_level')

# Consequent (Output)
priority = ctrl.Consequent(np.arange(0, 101, 1), 'priority')

# Membership Functions
pain_level.automf(3, names=['low', 'medium', 'high'])
breathing_difficulty.automf(3, names=['low', 'medium', 'high'])
consciousness_level.automf(3, names=['low', 'medium', 'high'])

priority['routine'] = fuzz.trimf(priority.universe, [0, 20, 40])
priority['low'] = fuzz.trimf(priority.universe, [30, 50, 70])
priority['medium'] = fuzz.trimf(priority.universe, [60, 75, 90])
priority['high'] = fuzz.trimf(priority.universe, [80, 90, 100])
priority['critical'] = fuzz.trimf(priority.universe, [95, 100, 100])

# Rules
rule1 = ctrl.Rule(consciousness_level['high'] | breathing_difficulty['high'] | pain_level['high'], priority['critical'])
rule2 = ctrl.Rule(consciousness_level['medium'] | breathing_difficulty['medium'], priority['high'])
rule3 = ctrl.Rule(pain_level['medium'], priority['medium'])
rule4 = ctrl.Rule(pain_level['low'] & breathing_difficulty['low'], priority['low'])
rule5 = ctrl.Rule(consciousness_level['low'], priority['routine'])


priority_ctrl = ctrl.ControlSystem([rule1, rule2, rule3, rule4, rule5])
priority_simulation = ctrl.ControlSystemSimulation(priority_ctrl)

def calculate_priority_fuzzy(symptoms):
    priority_simulation.input['pain_level'] = symptoms.get('painLevel', 0)
    priority_simulation.input['breathing_difficulty'] = symptoms.get('breathingDifficulty', 0)
    priority_simulation.input['consciousness_level'] = symptoms.get('consciousnessLevel', 0)

    priority_simulation.compute()

    score = priority_simulation.output['priority']

    if score > 90:
        return 1  # Critical
    elif score > 70:
        return 2  # High
    elif score > 50:
        return 3  # Medium
    elif score > 30:
        return 4  # Low
    else:
        return 5  # Routine

# In-memory database
patients = []
drugs = [
    {"name": "Aspirin", "quantity": 100},
    {"name": "Ibuprofen", "quantity": 50},
    {"name": "Paracetamol", "quantity": 200},
    {"name": "Amoxicillin", "quantity": 75},
    {"name": "Lisinopril", "quantity": 30},
]

@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    data = request.json
    message = data.get('message', '').lower()

    # Simple keyword-based response logic
    if 'list all' in message or 'inventory' in message:
        response_text = "Here is the current drug inventory:\n" + "\n".join([f"- {d['name']}: {d['quantity']}" for d in drugs])
        return jsonify({'reply': response_text})

    for drug in drugs:
        if drug['name'].lower() in message:
            return jsonify({'reply': f"We have {drug['quantity']} units of {drug['name']} in stock."})

    return jsonify({'reply': "I'm sorry, I don't understand. You can ask me to 'list all drugs' or ask about a specific drug's inventory, for example: 'how much aspirin do you have?'"})


def sort_patients_key(p):
    status_order = {'waiting': 1, 'in-progress': 2, 'completed': 3}
    # Sort by status, then by priority
    return (status_order.get(p.get('status'), 4), p.get('priority', 99))

@app.route('/api/patients', methods=['GET'])
def get_patients():
    sorted_patients = sorted(patients, key=sort_patients_key)
    return jsonify(sorted_patients)

@app.route('/api/patients', methods=['POST'])
def add_patient():
    patient_data = request.json
    patient_data['priority'] = calculate_priority_fuzzy(patient_data.get('symptoms', {}))
    patient_data['id'] = f"PAT-{len(patients) + 1}"
    
    # Calculate estimated wait time based on priority and patients ahead
    priority = patient_data['priority']
    # Count patients with higher or equal priority who are waiting or in-progress
    patients_ahead = len([p for p in patients 
                          if p.get('priority', 99) <= priority 
                          and p.get('status') in ['waiting', 'in-progress']])
    
    # Base wait time per priority level (in minutes)
    base_wait_times = {
        1: 5,   # Critical - 5 min
        2: 15,  # High - 15 min
        3: 30,  # Medium - 30 min
        4: 45,  # Low - 45 min
        5: 60   # Routine - 60 min
    }
    
    # Estimated wait time: base time + (patients ahead * average treatment time)
    avg_treatment_time = 20  # minutes per patient
    patient_data['estimatedWaitTime'] = base_wait_times.get(priority, 30) + (patients_ahead * avg_treatment_time)
    
    patients.append(patient_data)
    return jsonify(patient_data), 201

@app.route('/api/patients/<string:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    patient = next((p for p in patients if p['id'] == patient_id), None)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    data = request.json
    patient['status'] = data.get('status', patient['status'])
    return jsonify(patient)

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    total_patients = len(patients)
    critical_patients = len([p for p in patients if p.get('priority', 0) <= 2])
    completed_patients = len([p for p in patients if p.get('status') == 'completed'])
    in_progress_patients = len([p for p in patients if p.get('status') == 'in-progress'])
    waiting_patients = len([p for p in patients if p.get('status') == 'waiting'])

    # Calculate average wait time from all patients
    if patients:
        total_wait = sum(p.get('estimatedWaitTime', 0) for p in patients)
        avg_wait_time = round(total_wait / len(patients))
    else:
        avg_wait_time = 0

    priority_data = [{'priority': f'Priority {i}', 'count': len([p for p in patients if p.get('priority') == i])} for i in range(1, 6)]

    status_data = [
        {'name': 'Waiting', 'value': waiting_patients},
        {'name': 'In Progress', 'value': in_progress_patients},
        {'name': 'Completed', 'value': completed_patients},
    ]

    age_ranges = [
        {'range': '0-18', 'min': 0, 'max': 18},
        {'range': '19-35', 'min': 19, 'max': 35},
        {'range': '36-55', 'min': 36, 'max': 55},
        {'range': '56-70', 'min': 56, 'max': 70},
        {'range': '70+', 'min': 71, 'max': 200},
    ]
    age_data = [{'range': r['range'], 'count': len([p for p in patients if r['min'] <= p.get('age', 0) <= r['max']])} for r in age_ranges]

    # Mock hourly data for now
    hourly_data = []

    symptom_counts = {}
    for p in patients:
        for symptom, level in p.get('symptoms', {}).items():
            if level > 5:
                symptom_counts[symptom] = symptom_counts.get(symptom, 0) + 1

    top_symptoms = sorted([{'symptom': k, 'count': v} for k, v in symptom_counts.items()], key=lambda x: x['count'], reverse=True)[:5]


    return jsonify({
        'totalPatients': total_patients,
        'criticalPatients': critical_patients,
        'completedPatients': completed_patients,
        'inProgressPatients': in_progress_patients,
        'waitingPatients': waiting_patients,
        'avgWaitTime': avg_wait_time,
        'priorityData': priority_data,
        'statusData': status_data,
        'ageData': age_data,
        'hourlyData': hourly_data,
        'topSymptoms': top_symptoms,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
