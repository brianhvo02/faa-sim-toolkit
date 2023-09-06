import { faChevronCircleLeft, faChevronCircleRight, faEye, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { faEye as faEyeRegular } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type Dispatch, type SetStateAction, useState, type PropsWithChildren } from 'react';

interface SelectListProps extends PropsWithChildren {
    currentBasemap: string;
    icon: IconDefinition;
    className?: string;
    eyeText?: string;
    eyeStatus?: boolean;
    setEyeStatus?: Dispatch<SetStateAction<boolean>>;
}

const SelectList = ({ 
    currentBasemap, icon, className, children,
    eyeText, eyeStatus, setEyeStatus
}: SelectListProps) => {
    const [showLayerSelect, setShowLayerSelect] = useState(false);

    return (
            <div 
                className={`layers ${className ?? ''}`}
                style={{
                    transform: `translateX(${
                        showLayerSelect
                            ? '0'
                            : 'calc(3.5rem - 100%)'
                    })`
                }}
            >
                { children }
                <div 
                    className='layer-buttons'
                    style={{
                        color: currentBasemap === 'light-v11'
                            ? '#292929'
                            : '#FCFCFD'
                    }}
                >
                    <div
                        className='feature-layer-select'
                        onClick={() => setShowLayerSelect(prev => !prev)}
                    >
                        <FontAwesomeIcon icon={icon} />
                        {
                            showLayerSelect
                                ? <FontAwesomeIcon icon={faChevronCircleLeft} />
                                : <FontAwesomeIcon icon={faChevronCircleRight} />
                        }
                    </div>
                    {
                        setEyeStatus &&
                        <FontAwesomeIcon 
                            icon={eyeStatus ? faEye : faEyeRegular}
                            title={eyeText}
                            onClick={() => setEyeStatus(prev => !prev)}
                        />
                    }
                </div>
            </div>
    )
}

export default SelectList;