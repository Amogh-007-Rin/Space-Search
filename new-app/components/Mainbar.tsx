import { useEffect } from "react";
import Astroidcard from "./cards/Astroidcard";
import Infocard from "./cards/Infocard";
import useAstroidStats from "@/hooks/useAstroidStats";
import useInfoCardDataMapper from "@/mappers/infoMapper";

export default function Mainbar() {
    
    const {mappedData, loading, error} = useInfoCardDataMapper();

    return (
        <div className="main-container w-full h-[93%]">
            <div className="section-1 w-full h-[23%] flex items-center justify-evenly p-4">
                <Infocard label=" TOTAL NEO's" magnitude={mappedData.totalRecord} discription={ }></Infocard>
                <Infocard label="HAZARDOUS" magnitude="" discription=""></Infocard>
                <Infocard label="SAFE" magnitude="" discription=""></Infocard>
                <Infocard label="AVG VELOCITY" magnitude="" discription=""></Infocard>
                <Infocard label="MAX VELOCITY" magnitude="" discription=""></Infocard>
                <Infocard label="CLOSEST APPROACH" magnitude="" discription=""></Infocard>
            </div>
            <div className="section-2 w-full h-[20%]"></div>
            <div className="section-3 w-full h-[57%] bg-[#060610] text-white p-6">
                <Astroidcard></Astroidcard>
            </div>
        </div>
    );
};