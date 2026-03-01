export interface ContentFile {
  id?: number;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
}

export interface ContenuPedagogique {
  idContent?: number;
  titleC: string;
  duration: number;
  contentType: string;
  files?: ContentFile[];
  cours?: { id: number };
}

export interface Cours {
  id?: number;
  idProfessor?: number;
  title: string;
  description: string;
  content: string;
  image?: ContentFile;
  contenus?: ContenuPedagogique[];
}
