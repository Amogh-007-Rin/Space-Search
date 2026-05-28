interface infoCardProps{
    label?: string;
    magnitude?: string;
    discription?: string;
    children?: React.ReactNode
}

export default function Infocard({label, magnitude, discription, children}: infoCardProps){
    return(
        <div className="info-card min-w-[15vw] h-full bg-[#100F15] rounded-3xl overflow-hidden">
            <div className="w-full h-[40%]">
                <div className="h-full w-[50%] flex items-center px-3">
                    <div className="h-10 w-10 rounded-xl bg-[#000001]">
                        {children}
                    </div>
                </div>
                <div className="h-full w-[50%]">
                    <h3>{label}</h3>
                </div>
            </div>
            <div className="w-full h-[40%]] flex justify-center items-center">
                {magnitude}
            </div>
            <div className="w-full h-[20%]] flex justify-center items-center">
                {discription}
            </div>
        </div>
    );
};