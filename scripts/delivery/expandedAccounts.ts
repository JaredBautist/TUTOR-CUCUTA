import {deliveryAccounts,type DeliveryAccount} from './accounts';
import {emptyProfile} from '../../src/features/accounts/domain/profile';

const newTutors=[
 ['andres-martinez','Andrés Martínez','Matemáticas',28000],
 ['paula-rodriguez','Paula Rodríguez','Física',32000],
 ['daniel-gomez','Daniel Gómez','Programación',38000],
 ['natalia-vargas','Natalia Vargas','Química',30000],
 ['julian-cardenas','Julián Cárdenas','Estadística',35000],
 ['carolina-herrera','Carolina Herrera','Inglés',27000],
] as const;
const newStudents=[
 ['alejandro-perez','Alejandro Pérez',19],['valeria-moreno','Valeria Moreno',21],
 ['nicolas-castillo','Nicolás Castillo',20],['isabella-ramirez','Isabella Ramírez',18],
 ['david-ortiz','David Ortiz',23],['manuela-silva','Manuela Silva',22],
] as const;

/** Separate presentation expansion; original eight-account acceptance fixtures stay unchanged. */
export const presentationAccounts:DeliveryAccount[]=[...deliveryAccounts,
 ...newTutors.map(([key,name,subject,rate],index):DeliveryAccount=>({
  key,email:`${key}@demo.tutorcucuta.example`,role:'tutor',
  profile:{...emptyProfile('tutor'),name,title:`Docente particular de ${subject}`,experienceYears:3+index,subjects:[subject],ratePerHour:rate,coverageRadiusKm:5,bio:`Explicaciones paso a paso y ejercicios de ${subject}.`,specialties:[]},
  offer:{levels:['Grado 11 - Media','Universidad'],modalities:['presencial','virtual'],sector:'Centro',position:{latitude:7.89,longitude:-72.50},availability:[{day:3,start:'14:00',end:'18:00'},{day:5,start:'14:00',end:'18:00'}]},
 })),
 ...newStudents.map(([key,name,age]):DeliveryAccount=>({key,email:`${key}@demo.tutorcucuta.example`,role:'student',profile:{...emptyProfile('student'),name,age,grade:'Universidad',sector:'Centro',academicGoal:'Reforzar contenidos y preparar una evaluación.',difficultiesOrTopics:'Resolver ejercicios con acompañamiento.',learningStyles:['Explicaciones paso a paso']}})),
];
