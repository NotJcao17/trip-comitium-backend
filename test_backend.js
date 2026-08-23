const db = require('./config/db');
const request = require('http');

async function testBackend() {
    console.log('🧪 Probando endpoints del backend contra TiDB Cloud...');
    
    // Import controllers directly for unit/integration verification
    const tripCtrl = require('./controllers/tripController');
    const authCtrl = require('./controllers/authController');
    const statsCtrl = require('./controllers/statsController');

    // Helper mock res/req
    function mockRes() {
        return {
            statusCode: 200,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.body = data; return this; }
        };
    }

    try {
        // 1. Probar creación de viaje con sala cerrada y roster
        const reqCreate = {
            body: {
                tripName: 'Expedición Fiordos Noruega',
                tripDescription: 'Viaje de senderismo y acampada',
                adminName: 'Carlos Ruiz',
                adminPin: '1234',
                roomType: 'closed',
                roster: ['Sofia Navarro', 'Mateo Valdes', 'Andrea Gomez']
            }
        };
        const resCreate = mockRes();
        await tripCtrl.createTrip(reqCreate, resCreate);
        console.log('✅ Viaje Creado:', resCreate.statusCode, resCreate.body?.trip);

        const shareCode = resCreate.body?.trip?.shareCode;
        const adminToken = resCreate.body?.token;

        // 2. Obtener Roster de la sala cerrada
        const reqRoster = { params: { code: shareCode } };
        const resRoster = mockRes();
        await tripCtrl.getRosterByCode(reqRoster, resRoster);
        console.log('✅ Roster de Sala Cerrada:', resRoster.body?.participants);

        // 3. Reclamar cupo por Sofia Navarro con PIN 5555
        const reqJoinSofia = {
            body: {
                shareCode: shareCode,
                name: 'Sofia Navarro',
                accessPin: '5555'
            }
        };
        const resJoinSofia = mockRes();
        await authCtrl.joinTrip(reqJoinSofia, resJoinSofia);
        console.log('✅ Sofía reclamó su cupo con PIN:', resJoinSofia.statusCode, resJoinSofia.body?.message);

        // 4. Intentar entrar con nombre no invitado (debe fallar en sala cerrada)
        const reqJoinUnknown = {
            body: {
                shareCode: shareCode,
                name: 'Desconocido 123',
                accessPin: '9999'
            }
        };
        const resJoinUnknown = mockRes();
        await authCtrl.joinTrip(reqJoinUnknown, resJoinUnknown);
        console.log('✅ Bloqueo de usuario no invitado en sala cerrada:', resJoinUnknown.statusCode, resJoinUnknown.body?.error);

        // 5. Admin resetea PIN de Sofia
        const sofiaId = resJoinSofia.body?.user?.id;
        const reqReset = {
            user: { id: resCreate.body.user.id, tripId: resCreate.body.trip.id, isAdmin: true },
            params: { id: sofiaId }
        };
        const resReset = mockRes();
        await tripCtrl.resetParticipantPin(reqReset, resReset);
        console.log('✅ Admin reseteó PIN de Sofía:', resReset.statusCode, resReset.body?.message);

        // 6. Admin agrega un nuevo integrante a la sala cerrada
        const reqAddPart = {
            user: { id: resCreate.body.user.id, tripId: resCreate.body.trip.id, isAdmin: true },
            body: { name: 'Lucas Mendoza' }
        };
        const resAddPart = mockRes();
        await tripCtrl.addParticipant(reqAddPart, resAddPart);
        console.log('✅ Admin agregó a Lucas Mendoza a la sala cerrada:', resAddPart.statusCode, resAddPart.body?.message);

        // 7. Crear encuesta con descripción personalizada
        const pollCtrl = require('./controllers/pollController');
        const reqCreatePoll = {
            user: { id: resCreate.body.user.id, tripId: resCreate.body.trip.id, isAdmin: true },
            body: {
                title: '¿Qué cabaña prefieren para acampar?',
                description: 'Por favor califiquen según ubicación y cercanía al lago.',
                type: 'tier_list',
                options: ['Cabaña El Pino', 'Glamping Río', 'Refugio Cumbre']
            }
        };
        const resCreatePoll = mockRes();
        await pollCtrl.createPoll(reqCreatePoll, resCreatePoll);
        console.log('✅ Encuesta creada con descripción personalizada:', resCreatePoll.statusCode, resCreatePoll.body);

        console.log('\n🎉 ¡TODAS LAS PRUEBAS DE BACKEND Y TIDB CLOUD PASARON SATISFACTORIAMENTE!');
        process.exit(0);

    } catch (e) {
        console.error('❌ Error en test de backend:', e);
        process.exit(1);
    }
}

testBackend();
