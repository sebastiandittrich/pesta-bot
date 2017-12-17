import json

data = json.loads(open('convertjson.json', 'r').read())
teachers = []

for teacher in data:
    teachers.append({
        'first_name': teacher['Name'].split(',')[1].strip(),
        'last_name': teacher['Name'].split(',')[0].strip(),
        'name': teacher['Name'],
        'email': teacher['Email'].replace('(at)', '@'),
        'subjects': [subject.strip() for subject in teacher['Fächer'].split(',')],
        'extra_functions': [function.strip() for function in filter(lambda x: not not x, teacher['Funktionen'].split(','))]
    })

open('teacherdata.json', 'w').write(json.dumps(teachers))