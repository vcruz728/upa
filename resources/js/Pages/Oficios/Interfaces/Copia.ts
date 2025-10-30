export interface Copia {
    id: number;
    id_oficio: number;
    id_directorio: number;
    nombre: string;
    cargo: string;
    dependencia: string;
}

export interface Respuesta {
    id_oficio: number;
    id_directorio: number;
    tipo_destinatario: string;
    nombre: string;
    cargo: string;
    dependencia: string;
    respuesta: string;
    comentario: string;
}
