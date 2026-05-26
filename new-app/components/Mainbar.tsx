import Infocard from "./cards/Infocard";

export default function Mainbar(){
    return(
        <div className="main-container w-full h-[93%]">
            <div className="section-1 w-full h-[20%] flex items-center justify-evenly p-4">
                <Infocard></Infocard>
                <Infocard></Infocard>
                <Infocard></Infocard>
                <Infocard></Infocard>
                <Infocard></Infocard>
                <Infocard></Infocard>
            </div>
            <div className="section-2 w-full h-[20%] bg-zinc-400"></div>
            <div className="section-3 w-full h-[20%] bg-zinc-600"></div>
        </div>
    );
};