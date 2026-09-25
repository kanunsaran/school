import { usestate, useEffect } from "react";
import Aos from "aos";
import Swal from "sweetalert2";

export default function Bam() {

    const showAlert = () => {
        Swal.fire({
            title:"ง่วง",
            text:"ไปนอนสิ",
            confirmButtonAriaLabel
        })
    }

    useEffect(() => {
        Aos.init({
            duration: 1000,
            once: false,
        })

    }
)
    return (
        <>
            <div className="bg-red-500">bam</div>
            <div>bam</div>
        </>
    )
}
