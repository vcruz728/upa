import buapAzul from "../assets/images/logos/buap_azul.webp";
import buapBlanco from "../assets/images/logos/buap_blanco.webp";
import buapBlancoDos from "../assets/images/logos/buap_blanco_2.webp";
import minervaAzul from "../assets/images/logos/minerva_azul.webp";
import minervaGris from "../assets/images/logos/minerva_gris.webp";
import minervaBlanco from "../assets/images/logos/minerva_blanco.webp";
import minervaBuapAcostadoAzul from "../assets/images/logos/minerva_buap_costado_azul.webp";
import minervaBuapAcostadoBlanco from "../assets/images/logos/minerva_buap_costado_blanco.webp";
import minervaBuapBlanco from "../assets/images/logos/minerva_buap_blanco.webp";
import minervaBuapAzul from "../assets/images/logos/minver_buap_azul.webp";
import bAzul from "../assets/images/logos/b_azul.webp";
import bBlanco from "../assets/images/logos/b_blanco.webp";
import user from "../assets/images/user.png";

export const Imagesdata = (data: any) => {
    const img: any = {
        buapAzul,
        buapBlanco,
        minervaAzul,
        minervaGris,
        minervaBlanco,
        minervaBuapAcostadoAzul,
        minervaBuapAcostadoBlanco,
        minervaBuapBlanco,
        minervaBuapAzul,
        bAzul,
        bBlanco,
        buapBlancoDos,
        user,
    };

    return img[data];
};
