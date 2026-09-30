import { useState, type ImgHTMLAttributes } from 'react';
import { User } from 'lucide-react';
/** Reserve the supplied avatar box and retain an accessible fallback after image failure. */
export function ProfileImage({src,alt,className, ...attributes}:ImgHTMLAttributes<HTMLImageElement> & {src:string;alt:string;className:string}) {
  const [failed,setFailed]=useState('');
  return src && failed!==src ? <img {...attributes} src={src} alt={alt} width={96} height={96} loading="lazy" decoding="async" className={className} onError={()=>setFailed(src)}/>
    : <span role="img" aria-label={alt} className={`${className} inline-flex items-center justify-center bg-teal-50 text-teal-800`}><User aria-hidden="true"/></span>;
}
