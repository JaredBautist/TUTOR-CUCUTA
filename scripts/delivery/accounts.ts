import {emptyProfile, type AccountRole, type ProfileFields} from '../../src/features/accounts/domain/profile';
import type {OfferDraft} from '../../src/features/marketplace/domain/contracts';
import type {SearchFilters,Tutor} from '../../src/types';
import {initialSearchFilters} from '../../src/data/searchDefaults';

export const DELIVERY_SET='academic-2026-09-17';
interface DeliveryAccount {key:string;email:string;role:AccountRole;profile:ProfileFields;offer?:Omit<OfferDraft,'phone'|'version'|'published'>}
const tutor=(key:string,name:string,title:string,rate:number,subjects:string[],sector:string,modalities:OfferDraft['modalities'],position:OfferDraft['position'],day:number,start:string,end:string):DeliveryAccount=>({
 key,email:`${key}@demo.tutorcucuta.example`,role:'tutor',
 profile:{...emptyProfile('tutor'),name,title,experienceYears:4,ratePerHour:rate,subjects,coverageRadiusKm:5,
  bio:`Acompañamiento en ${subjects.join(' y ')} con explicaciones paso a paso y ejercicios prácticos.`,specialties:subjects.includes('Matemáticas')?['Límites','Funciones','Álgebra']:['Conversación','Comprensión lectora']},
 offer:{levels:['Grado 11 - Media','Universidad'],modalities,sector,position,availability:[{day,start,end}]},
});
const student=(key:string,name:string,age:number,grade:string,goal:string,sector:string):DeliveryAccount=>({
 key,email:`${key}@demo.tutorcucuta.example`,role:'student',profile:{...emptyProfile('student'),name,age,grade,academicGoal:goal,difficultiesOrTopics:goal,sector,learningStyles:['Explicaciones paso a paso','Ejercicios prácticos']},
});
export const deliveryAccounts:DeliveryAccount[]=[
 tutor('sebastian-mendoza','Sebastián Mendoza','Ingeniero de sistemas',30000,['Matemáticas'],'Centro',['presencial'],{latitude:7.89,longitude:-72.50},1,'15:00','18:00'),
 tutor('valentina-duarte','Valentina Duarte','Licenciada en Matemáticas y Física',45000,['Matemáticas','Física'],'Guaimaral',['presencial','virtual'],{latitude:7.92,longitude:-72.49},1,'14:00','18:00'),
 tutor('camilo-becerra','Camilo Becerra','Ingeniero electrónico',25000,['Matemáticas'],'Cúcuta',['virtual'],undefined,2,'18:00','21:00'),
 tutor('laura-quintero','Laura Quintero','Licenciada en Lenguas Extranjeras',35000,['Inglés'],'Los Patios',['presencial','virtual'],{latitude:7.84,longitude:-72.50},2,'18:00','21:00'),
 student('mateo-rojas','Mateo Rojas',16,'Grado 11 - Media Académica','Preparar la bimestral de matemáticas: límites por sustitución y factorización.','Centro'),
 student('salome-torres','Salomé Torres',17,'Grado 11 - Media Académica','Reforzar física y resolver ejercicios de movimiento.','Guaimaral'),
 student('santiago-suarez','Santiago Suárez',20,'Universidad','Comprender límites y funciones en cálculo.','La Riviera'),
 student('mariana-castro','Mariana Castro',22,'Universidad','Practicar conversación y comprensión lectora en inglés.','Los Patios'),
];

/** Local acceptance projection only; the application loads actual published records. */
export function deliveryTutors():Tutor[]{return deliveryAccounts.filter(a=>a.offer).map(a=>({
 id:a.key,name:String(a.profile.name),title:String(a.profile.title),institution:'',avatar:'',
 experienceYears:Number(a.profile.experienceYears),ratePerHour:Number(a.profile.ratePerHour),verified:false,
 subjects:a.profile.subjects as string[],specialties:a.profile.specialties as string[],bio:String(a.profile.bio),
 coverageRadiusKm:Number(a.profile.coverageRadiusKm),location:a.offer!.position,
 levels:a.offer!.levels,modalities:a.offer!.modalities,sector:a.offer!.sector,availability:a.offer!.availability,
 nextAvailable:'',methodologySteps:[],matchReasons:[],
}));}
const origin={latitude:7.89,longitude:-72.50};
const base:SearchFilters={...initialSearchFilters,subject:'Matemáticas',educationLevel:'Grado 11 - Media',modality:'presencial',maxBudget:40000,availableDays:['L'],timeSlot:'Tarde',radiusKm:5};
export const deliveryScenarios=[
 {name:'mathematics presencial within COP 40000',filters:base,origin,expected:['sebastian-mendoza']},
 {name:'higher budget includes the second presencial tutor',filters:{...base,maxBudget:50000},origin,expected:['sebastian-mendoza','valentina-duarte']},
 {name:'one kilometre excludes the farther tutor',filters:{...base,maxBudget:50000,radiusKm:1},origin,expected:['sebastian-mendoza']},
 {name:'virtual mathematics Tuesday evening',filters:{...base,modality:'virtual' as const,maxBudget:30000,availableDays:['M'],timeSlot:'Noche'},origin:undefined,expected:['camilo-becerra']},
 {name:'virtual English Tuesday evening',filters:{...base,subject:'Inglés',modality:'virtual' as const,availableDays:['M'],timeSlot:'Noche'},origin:undefined,expected:['laura-quintero']},
 {name:'insufficient budget produces no matches',filters:{...base,maxBudget:20000},origin,expected:[]},
];

/** Reject email collisions unless admin metadata and immutable role belong to this delivery. */
export function assertOwnedIdentity(account:DeliveryAccount,user:{email?:string;app_metadata:Record<string,unknown>;user_metadata:Record<string,unknown>}):void{
 if(user.email!==account.email || user.app_metadata.delivery_set!==DELIVERY_SET || user.user_metadata.account_role!==account.role){
  throw new Error(`Refusing unrelated or role-mismatched identity: ${account.key}`);
 }
}
