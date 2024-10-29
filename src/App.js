import React, { useState, useRef, useEffect } from 'react';
import { Box, 
         TextField, 
         Button, 
         Typography, 
         Container, 
         Radio, 
         RadioGroup, 
         FormControlLabel, 
         FormControl, 
         FormLabel,
         Paper,
         Grid2,
         InputAdornment } from '@mui/material';
import Grid from '@mui/material/Grid2';
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import GasMeterIcon from '@mui/icons-material/GasMeter';
import OpacityIcon from '@mui/icons-material/Opacity';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DeleteIcon from '@mui/icons-material/Delete';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import EarthMap from './img/no_clouds.jpg';
import CloudsMap from './img/clouds.png';
import './App.css';
import countryData from './filtered_data.json';
import KoreaCO2_2 from './img/korea_co2_emission2.png'
import KoreaCO2_3 from './img/korea_co2_emission3.png'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const xyz_from_lat_lng = (lat, lng, radius) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return {
    x: -((radius - 0.05) * Math.sin(phi) * Math.cos(theta)),
    y: (radius + 0.05) * Math.cos(phi),
    z: (radius - 0.01) * Math.sin(phi) * Math.sin(theta),
  };
};

const Earth = ({ children }) => {
  const [earthTexture] = useLoader(TextureLoader, [EarthMap]);
  const [cloudsTexture] = useLoader(TextureLoader, [CloudsMap]);

  return (
    <>
      <Sphere args={[1, 32, 32]} scale={2}>
        <meshPhongMaterial map={earthTexture} />
        {children}
      </Sphere>
      <Sphere args={[1.01, 32, 32]} scale={2.02}>
        <meshPhongMaterial map={cloudsTexture} transparent={true} opacity={0.5} />
      </Sphere>
    </>
  );
};

const CameraOrbitController = ({ targetPosition, isInteracting, setIsInteracting }) => {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3()); 
  const timerRef = useRef(null); 

  useFrame(() => {
    if (targetPosition) {
      
      camera.position.lerp(targetRef.current, 0.05);
      camera.lookAt(targetPosition.x, targetPosition.y, targetPosition.z);
    }
  });

  useEffect(() => {
    if (targetPosition) {
      const direction = targetPosition.clone().normalize();
      const cameraDistance = 2.5; 
      targetRef.current.copy(direction.multiplyScalar(cameraDistance));
    }
  }, [targetPosition]);

 
  useEffect(() => {
    if (isInteracting) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setIsInteracting(false); 
      }, 10000); 
    }
  }, [isInteracting, setIsInteracting]);

  return null;
};

const GlobeDots = ({ globeRadius, colours, onDotClick }) => {
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const { camera } = useThree();

  return (
    <>
      {countryData.map(({ lat, lng, name }) => {
        const { x, y, z } = xyz_from_lat_lng(parseFloat(lat), parseFloat(lng), globeRadius);
        const dotPosition = new THREE.Vector3(x, y, z);

        return (
          <VisibleDot
            key={name}
            position={dotPosition}
            camera={camera}
            onDotClick={() =>
              onDotClick({ name, lat, lng, position: new THREE.Vector3(x, y, z) })
            }
            isHovered={hoveredCountry === name}
            onHover={() => setHoveredCountry(name)}
            onOut={() => setHoveredCountry(null)}
            colours={colours}
            name={name}
          />
        );
      })}
    </>
  );
};

const VisibleDot = ({ position, camera, onDotClick, isHovered, onHover, onOut, colours, name }) => {
  const ref = useRef();

  useFrame(() => {
    if (ref.current) {
      const cameraDirection = camera.position.clone().sub(new THREE.Vector3(0, 0, 0)).normalize();
      const dotDirection = position.clone().normalize();

      const visibilityThreshold = 0.05;
      const isInFront = cameraDirection.dot(dotDirection) > visibilityThreshold;
      ref.current.style.display = isInFront ? 'block' : 'none';
    }
  });

  return (
    <group position={position}>
      <Html zIndexRange={[0]} distanceFactor={10} ref={ref} position={[0, 0, 0]}>
        <div
          onClick={onDotClick}
          onMouseOver={onHover}
          onMouseOut={onOut}
          style={{
            width: '8px',
            height: '8px',
            background: colours.globeDots,
            borderRadius: '50%',
            cursor: 'pointer',
            border: '1px solid black',
          }}
        />
      </Html>

      {isHovered && (
        <Html zIndexRange={[0]} distanceFactor={10} position={[0, 0.05, 0]} style={{ pointerEvents: 'none'}}>
          <div
            style={{
              background: 'white',
              padding: '4px',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'black',
              border: '1px solid black',
            }}
          >
            {name}
          </div>
        </Html>
      )}
    </group>
  );
};

// 선택한 국가의 정보를 표시하는 창
const InfoModal = ({ selectedCountry, onClose }) => {
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [policyImpact, setPolicyImpact] = useState(0);

  const LAST_KNOWN_YEAR = 2021; // 데이터를 가진 마지막 년도

  useEffect(() => {
    if (selectedCountry) {
      setSelectedPolicy(null);
      setPolicyImpact(0); // 국가 변경 시 정책에 의한 영향 값 초기화
    }
  }, [selectedCountry]);

  if (!selectedCountry) return null;

  const countryInfo = countryData.find((country) => country.name === selectedCountry.name);
  const southKoreaInfo = countryData.find((country) => country.name === "South Korea");

  // 2017년 부터 2050년 까지 라벨 생성
  const yearLabels = Array.from({ length: 2050 - 2017 + 1 }, (_, i) => (2017 + i).toString());

  // 한국의 탄소 정책 없이 예측되는 탄소 배출량
  const southKoreaLastKnownEmission = southKoreaInfo.emissions[southKoreaInfo.emissions.length - 1] || 0;
  const annualIncrease = 5;

  const southKoreaNoActionEmissions = [
    ...southKoreaInfo.emissions, // 2021년까지는 실제 데이터
    ...Array.from({ length: yearLabels.length - southKoreaInfo.emissions.length }, (_, i) =>
      southKoreaLastKnownEmission + (i + 1) * annualIncrease
    ),
  ];

  // 2022년부터 이후는 한국의 선택된 정책의 영향을 받음
  const withSelectedPolicyInSouthKorea = southKoreaNoActionEmissions.map((emission, i) => {
    const year = parseInt(yearLabels[i]);
    if (year > LAST_KNOWN_YEAR) {
      const yearsSince2021 = year - LAST_KNOWN_YEAR;
      return emission - yearsSince2021 * policyImpact;
    }
    return emission; // 2017-2921년은 기존 데이터 사용
  });

  // 선택한 국가의 탄소 정책 없이 예측되는 탄소 배출량
  const selectedCountryLastKnownEmission = countryInfo.emissions[countryInfo.emissions.length - 1] || 0;
  const selectedCountryNoActionEmissions = [
    ...countryInfo.emissions,
    ...Array.from({ length: yearLabels.length - countryInfo.emissions.length }, (_, i) =>
      selectedCountryLastKnownEmission + (i + 1) * annualIncrease
    ),
  ];

  // 2022년부터 이후는 선택된 국가의 선택된 정책의 영향을 받음
  const withPolicyInSelectedCountry = selectedCountryNoActionEmissions.map((emission, i) => {
    const year = parseInt(yearLabels[i]);
    if (year > LAST_KNOWN_YEAR) {
      const yearsSince2021 = year - LAST_KNOWN_YEAR;
      return emission - yearsSince2021 * policyImpact;
    }
    return emission; // 2017-2021년은 기존 데이터 사용
  });

  // 정책 클릭 시 해당 정책의 영향력을 설정
  const handlePolicyClick = (policy) => {
    setSelectedPolicy(policy.name);
    setPolicyImpact(policy.impact || 0);
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'white' // Set legend text color to white
        }
      },
      tooltip: {
        bodyColor: 'white', // Set tooltip text color to white
        titleColor: 'white'
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'white' // Set x-axis tick color to white
        },
        title: {
          color: 'white' // Set x-axis title color to white
        }
      },
      y: {
        ticks: {
          color: 'white' // Set y-axis tick color to white
        },
        title: {
          color: 'white' // Set y-axis title color to white
        }
      }
    }
  };

  // 선택된 국가가 한국인지 아닌지 체크
  const selectedCountryChartData = {
    labels: yearLabels,
    datasets: [
      {
        label: `${countryInfo.name} 탄소 배출량 (정책 없음)`,
        data: selectedCountryNoActionEmissions,
        fill: false,
        backgroundColor: 'rgba(255,99,132,1)',
        borderColor: 'rgba(255,99,132,1)',
      },
      {
        label: `선택한 정책을 적용한 ${countryInfo.name} 탄소 배출량`,
        data: withPolicyInSelectedCountry,
        fill: false,
        backgroundColor: 'rgba(75,192,192,1)',
        borderColor: 'rgba(75,192,192,1)',
      },
    ]
  };

  const southKoreaChartData = {
    labels: yearLabels,
    datasets: [
      {
        label: `한국 탄소 배출량 (정책 없음)`,
        data: southKoreaNoActionEmissions,
        fill: false,
        backgroundColor: 'rgba(255,99,132,1)',
        borderColor: 'rgba(255,99,132,1)',
      },
      {
        label: `${countryInfo.name}의 정책을 적용한 한국 탄소 배출량`,
        data: withSelectedPolicyInSouthKorea,
        fill: false,
        backgroundColor: 'rgba(75,192,192,1)',
        borderColor: 'rgba(75,192,192,1)',
      },
    ]
  };

  return (
    <div className="info-modal" 
         style={{
           zIndex: 1000, 
           position: 'absolute', 
           top: '50%',  
           left: '5%',
           transform: 'translateY(-50%)',
           width: '70%',  
           maxHeight: '90%', 
           overflowY: 'auto', 
           backgroundColor: 'white',
           border: '1px solid black', 
           padding: '20px',
           borderRadius: '10px',
           boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.2)',
         }}>
      <div className="info-modal-content" style={{ zIndex: 1001 }}>
        <button className="close-button" onClick={onClose} style={{ float: 'right', fontSize: '18px' }}>X</button>
        <h2 style={{ fontSize: '22px', marginBottom: '10px' }}>{countryInfo.name}</h2>

        {/* Flex container for layout */}
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Far Left - Carbon Neutral Policies */}
          <div style={{ flex: '0.5', paddingRight: '10px' }}>
            <h3 style={{ fontSize: '18px' }}>탄소 중립 정책:</h3>
            <ul style={{ fontSize: '16px', lineHeight: '1.5', paddingLeft: '20px' }}>
              {countryInfo.policies.map((policy, index) => (
                <li
                  key={index}
                  style={{ cursor: 'pointer', color: 'blue' }}
                  onClick={() => handlePolicyClick(policy)}
                >
                  {policy.name}
                </li>
              ))}
            </ul>
          </div>

          {/* Middle - Selected Policy Description */}
          <div style={{ flex: '1', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
            {selectedPolicy ? (
              <div>
                <h4 style={{ fontSize: '16px', marginBottom: '5px' }}>선택한 정책: {selectedPolicy}</h4>
                <p style={{ fontSize: '14px' }}>
                  영향력: {policyImpact}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: 'gray' }}>정책을 선택하고 여기서 해당 정책의 세부 사항과 영향력을 확인하세요.</p>
            )}
          </div>

          {/* Right - Carbon Emissions Graph(s) */}
          <div style={{ flex: '1', paddingLeft: '10px' }}>
            {selectedCountry.name === "South Korea" ? (
              <div>
                <h3 style={{ fontSize: '18px' }}>한국의 시간 경과에 따른 탄소 배출량</h3>
                <div style={{ padding: '10px', height: '400px', width: '100%' }}>
                  <Line data={southKoreaChartData} options={{ maintainAspectRatio: false }} />
                </div>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '18px' }}>{countryInfo.name} 시간 경과에 따른 탄소 배출량</h3>
                <div style={{ padding: '10px', height: '330px', width: '100%' }}>
                  <Line data={selectedCountryChartData} options={{ chartOptions, maintainAspectRatio: false }} />
                </div>
                
                <h3 style={{ fontSize: '18px' }}> {countryInfo.name}의 {selectedPolicy} 정책을 적용한 한국의 탄소 배출량</h3>
                <div style={{ padding: '10px', height: '330px', width: '100%' }}>
                  <Line data={southKoreaChartData} options={{ chartOptions, maintainAspectRatio: false }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



const Overlay = ({ onClose }) => (
  <div className="overlay" style={{ zIndex: 1000 }}>
    <div className="overlay-content" style={{ zIndex: 1001 }}>
      <h1>지구를 구합시다</h1>
      <h2>함께한다면 할 수 있습니다</h2>
      <p>
        기후 변화로 인한 위협이 점점 가까워지고 있습니다<br />
        더 늦기 전에 행동하여 우리의 소중한 보금자리를 지켜냅시다<br />
      </p>
      <p>본 사이트는 탄소 중립 정책 등을 제공하여 우리가 할 수 있는 최소한의 행동들을 제공합니다.</p>
      <button onClick={onClose}>좋아요</button>
    </div>
  </div>
);


const MainPage = () => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [targetPosition, setTargetPosition] = useState(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const handleDotClick = (country) => {
    setSelectedCountry(country);
    setTargetPosition(country.position);
  };

  const handleCloseModal = () => {
    setSelectedCountry(null);
    setTargetPosition(null);
  };

  return (
    <div className="main-content">
      <Canvas className="canvas-container">
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        <Earth>
          <GlobeDots globeRadius={1} colours={{ globeDots: 'white' }} onDotClick={handleDotClick} />
        </Earth>
        <OrbitControls 
          onStart={() => setIsInteracting(true)} 
          onEnd={() => setIsInteracting(false)} 
          enableZoom={true} 
        />
        <CameraOrbitController 
          targetPosition={targetPosition} 
          isInteracting={isInteracting} 
          setIsInteracting={setIsInteracting} 
        />
        <Stars />
      </Canvas>
      <InfoModal selectedCountry={selectedCountry} onClose={handleCloseModal} />
    </div>
  );
};

const CarbonEmission = () => {
  return (
    <div
      className="carbon-emission"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        paddingTop: '80px',
        minHeight: '100vh', 
        boxSizing: 'border-box',
      }}
    >
      <h1 style={{ position: 'relative', zIndex: 10}}>국제 탄소 배출 현황</h1>
      <text>
        전 세계에서 배출되고 있는 탄소 배출 현황을 알 수 있습니다.<br/>
        Table 버튼을 누르면 표의 형태로, Map 버튼을 누르면 세계 지도 형태로, Chart 버튼을 누르면 선 그래프의 형태로 표시됩니다.<br/>
        우측에는 각 형태에 맞게 상호작용하는 추가 옵션 기능이 있습니다.
      </text>
      <h2 style={{ position: 'relative', zIndex: 10}}>인당 탄소 배출 세계 지도</h2>
      <text style={{ position: 'relative', zIndex: 10}}>
        이 지도는 각 나라별 1인당 탄소 배출량을 색으로 구분하여 표시합니다.
      </text>
      <iframe 
        src="https://ourworldindata.org/grapher/co-emissions-per-capita?tab=map"
        style={{width: '100%', height: '600px', border: 'none'}} 
        allow="web-share; clipboard-write"
      />
      <h2 style={{ position: 'relative', zIndex: 10}}>연간 탄소 배출 그래프</h2>
      <text style={{ position: 'relative', zIndex: 10}}>
        이 그래프는 연도별 전세계 총합, 각 나라의 탄소 배출량을 표시합니다.
        </text>
      <iframe
        src="https://ourworldindata.org/grapher/annual-co2-emissions-per-country?country=~OWID_WRL&tab=chart"
        style={{ width: '100%', height: '600px', border: 'none'}}
        allow="web-share; clipboard-write"
      />
      <h1 style={{ position: 'relative', zIndex: 10}}>국내 탄소 배출 현황</h1>
      <text>
        국내에서 배출되고 있는 연도별 탄소 배출 현황을 알 수 있습니다.<br/>
        총배출량은 LULUCF(토지이용, 토지이용 변화 및 임업) 분야를 제외한 에너지, 산업 등 분야별 배출량의 합계를 말하며,<br/>
        순배출량은 LULUCF 분야의 배출원 및 흡수원을 포함한 전 분야 합계를 뜻합니다.
      </text>
      <h2 style={{position:'relative', zIndex: 10}}>연간 탄소 배출 그래프</h2>
      <text>
        이 그래프는 국내에서 연간 발생하고 있는 온실가스 배출량을 표시한 그래프입니다.
      </text>
      <img 
        src={KoreaCO2_2} 
        style={{position:'relative', width: '100%', height: '600px', border: 'none'}}
        alt="image not found"/>
      <h2 style={{position:'relative', zIndex: 10}}>연간 탄소 총배출량 및 순배출량 그래프</h2>
      <text>
        이 그래프는 국내에서 연간 발생하고 있는 온실가스의 총배출량 및 순배출량을 표시한 그래프입니다.
      </text>
      <img 
        src={KoreaCO2_3} 
        style={{position:'relative', width: '100%', height: '600px', border: 'none'}}
        alt="image not found"/>
    </div>
  );
};

const CarbonCalculator = () => {
  // 입력값 초기화
  const [electricity, setElectricity] = useState('');
  const [gas, setGas] = useState('');
  const [water, setWater] = useState('');
  const [distance, setDistance] = useState('');
  const [carType, setCarType] = useState('none'); // 기본 값을 '승용차 없음' 으로 지정
  const [waste, setWaste] = useState({ liters: '', kilograms: '' });
  const [emissions, setEmissions] = useState({
    electricity: 0,
    gas: 0,
    water: 0,
    car: 0,
    waste: 0,
  });
  const [totalFootprint, setTotalFootprint] = useState(0);

  // 영역 별 배출 값 정의하기
  const emissionFactors = {
    electricity: 0.4781, // kg of CO2 per kWh
    gas: 2.176, // kg of CO2 per m3 of gas
    water: 0.237, // kg of CO2 per m3 of water
    waste: 0.5573, // kg of CO2 per unit of waste
    car: {
      gasoline: { factor: 2.097, efficiency: 16.04 }, // kg CO2 per km and fuel efficiency km/l
      diesel: { factor: 2.582, efficiency: 15.35 },
      lpg: { factor: 1.868, efficiency: 11.06 },
      none: 0, // 승용차 없음 선택 시 0
    },
  };

  // 계산
  const calculateEmissions = () => {
    // 각 영역을 개별로 계산
    const electricityEmissions = electricity * emissionFactors.electricity;
    const gasEmissions = gas * emissionFactors.gas;
    const waterEmissions = water * emissionFactors.water;
    const wasteEmissions = (waste.liters + waste.kilograms) * emissionFactors.waste;

    // 승용차 종류에 맞게 계산
    let carEmissions = 0;
    if (carType !== 'none') {
      const carFactor = emissionFactors.car[carType];
      carEmissions = (distance / carFactor.efficiency) * carFactor.factor;
    }

    setEmissions({
      electricity: electricityEmissions,
      gas: gasEmissions,
      water: waterEmissions,
      car: carEmissions,
      waste: wasteEmissions,
    });
  };

  // 버튼 클릭 시 각 영역 값을 모두 더해서 총 값을 계산
  const calculateTotalFootprint = () => {
    setTotalFootprint(
      emissions.electricity +
        emissions.gas +
        emissions.water +
        emissions.car +
        emissions.waste
    );
  };

  // 출력값
  const formatOutput = (value) => {
    const formatted = value.toFixed(1).padStart(8, '0'); // 소수점 이전에 7자의 숫자를 가지게 함
    const digits = formatted.split(''); // 각 문자를 나눔
    return digits;
  };

  // 실시간으로 값 계산
  useEffect(() => {
    calculateEmissions();
  }, [electricity, gas, water, distance, carType, waste]);

  // 각 영역에서 값 가져오기
  const formattedElectricity = formatOutput(emissions.electricity);
  const formattedGas = formatOutput(emissions.gas);
  const formattedWater = formatOutput(emissions.water);
  const formattedCar = formatOutput(emissions.car);
  const formattedWaste = formatOutput(emissions.waste);
  const formattedTotal = formatOutput(totalFootprint);

  // 각 영역 스타일 정하기
  const sectionStyle = {
    padding: '20px',
    marginBottom: '20px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  };

  return (
    <Container maxWidth="md" style={{ marginTop: '20px', paddingTop: '80px' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        탄소 발자국 계산기
      </Typography>

      {/* 전기 영역 */}
      <Paper elevation={3} sx={sectionStyle}>
        <Box display="flex" alignItems="center" marginBottom={2}>
          <ElectricalServicesIcon color="primary" />
          <Typography variant="h6" marginLeft={1}>
            전기 (Electricity)
          </Typography>
        </Box>
        <TextField
          label="전기 사용량 (Electricity Usage)"
          type="number"
          value={electricity}
          onChange={(e) => setElectricity(Number(e.target.value))}
          variant="outlined"
          fullWidth
          InputProps={{
            endAdornment: <InputAdornment position="end">kWh/월</InputAdornment>,
            inputProps: { min: 0, style: { MozAppearance: 'textfield'} },
          }}
          sx={{
            input: {
              '::-webkit-outer-spin-button': { display: 'none' }, //스피너 가리기
              '::-webkit-inner-spin-button': { display: 'none' },
            },
          }}
        />
        <Box display="flex" justifyContent="center" gap={1} marginTop={2}>
          {formattedElectricity.map((digit, index) => (
            <TextField
              key={index}
              value={digit}
              disabled
              variant="outlined"
              inputProps={{
                style: {
                  textAlign: 'center',
                  width: index === 7 ? '20px' : '30px',
                  padding: '5px',
                  color: index === 7 ? 'black' : 'blue',
                  fontWeight: 'bold',
                },
                readOnly: true,
              }}
            />
          ))}
          <Typography variant="body2" color="textSecondary">kg/월</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" marginTop={1}>
          전기 CO₂ 발생량 (전기 사용량 * 0.4781)
        </Typography>
      </Paper>

      {/* 가스 영역 */}
      <Paper elevation={3} sx={sectionStyle}>
        <Box display="flex" alignItems="center" marginBottom={2}>
          <GasMeterIcon color="primary" />
          <Typography variant="h6" marginLeft={1}>
            가스 (Gas)
          </Typography>
        </Box>
        <TextField
          label="가스 사용량 (Gas Usage)"
          type="number"
          value={gas}
          onChange={(e) => setGas(Number(e.target.value))}
          variant="outlined"
          fullWidth
          InputProps={{
            endAdornment: <InputAdornment position="end">m³/월</InputAdornment>,
            inputProps: { min: 0, style: { MozAppearance: 'textfield'} },
          }}
        />
        <Box display="flex" justifyContent="center" gap={1} marginTop={2}>
          {formattedGas.map((digit, index) => (
            <TextField
              key={index}
              value={digit}
              disabled
              variant="outlined"
              inputProps={{
                style: {
                  textAlign: 'center',
                  width: index === 7 ? '20px' : '30px',
                  padding: '5px',
                  color: index === 7 ? 'black' : 'blue',
                  fontWeight: 'bold',
                },
                readOnly: true,
              }}
            />
          ))}
          <Typography variant="body2" color="textSecondary">kg/월</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" marginTop={1}>
          가스 CO₂ 발생량 (가스 사용량 * 2.176)
        </Typography>
      </Paper>

      {/* 수도 영역 */}
      <Paper elevation={3} sx={sectionStyle}>
        <Box display="flex" alignItems="center" marginBottom={2}>
          <OpacityIcon color="primary" />
          <Typography variant="h6" marginLeft={1}>
            수도 (Water)
          </Typography>
        </Box>
        <TextField
          label="수도 사용량 (Water Usage)"
          type="number"
          value={water}
          onChange={(e) => setWater(Number(e.target.value))}
          variant="outlined"
          fullWidth
          InputProps={{
            endAdornment: <InputAdornment position="end">m³/월</InputAdornment>,
            inputProps: { min: 0, style: { MozAppearance: 'textfield'} },
          }}
          sx={{
            input: {
              '::-webkit-outer-spin-button': { display: 'none' }, 
              '::-webkit-inner-spin-button': { display: 'none' },
            },
          }}
        />
        <Box display="flex" justifyContent="center" gap={1} marginTop={2}>
          {formattedWater.map((digit, index) => (
            <TextField
              key={index}
              value={digit}
              disabled
              variant="outlined"
              inputProps={{
                style: {
                  textAlign: 'center',
                  width: index === 7 ? '20px' : '30px',
                  padding: '5px',
                  color: index === 7 ? 'black' : 'blue',
                  fontWeight: 'bold',
                },
                readOnly: true,
              }}
            />
          ))}
          <Typography variant="body2" color="textSecondary">kg/월</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" marginTop={1}>
          수도 CO₂ 발생량 (수도 사용량 * 0.237)
        </Typography>
      </Paper>

      {/* 교통 영역 */}
      <Paper elevation={3} sx={sectionStyle}>
        <Box display="flex" alignItems="center" marginBottom={2}>
          <DirectionsCarIcon color="primary" />
          <Typography variant="h6" marginLeft={1}>
            자동차 (Car)
          </Typography>
        </Box>
        <FormControl component="fieldset">
          <FormLabel component="legend">승용차 종류</FormLabel>
          <RadioGroup
            row
            value={carType}
            onChange={(e) => setCarType(e.target.value)}
          >
            <FormControlLabel value="gasoline" control={<Radio />} label="휘발유" />
            <FormControlLabel value="diesel" control={<Radio />} label="경유" />
            <FormControlLabel value="lpg" control={<Radio />} label="LPG" />
            <FormControlLabel value="none" control={<Radio />} label="승용차 없음" />
          </RadioGroup>
        </FormControl>
        <TextField
          label="주행 거리 (Distance Traveled)"
          type="number"
          value={distance}
          onChange={(e) => setDistance(Number(e.target.value))}
          variant="outlined"
          fullWidth
          disabled={carType === 'none'} // 승용차 없음 선택 시 입력 못하게끔
          InputProps={{
            endAdornment: <InputAdornment position="end">km/월</InputAdornment>,
            inputProps: { min: 0, style: { MozAppearance: 'textfield'} },
          }}
          sx={{
            input: {
              '::-webkit-outer-spin-button': { display: 'none' }, 
              '::-webkit-inner-spin-button': { display: 'none' },
            },
          }}
        />
        <Box display="flex" justifyContent="center" gap={1} marginTop={2}>
          {formattedCar.map((digit, index) => (
            <TextField
              key={index}
              value={digit}
              disabled
              variant="outlined"
              inputProps={{
                style: {
                  textAlign: 'center',
                  width: index === 7 ? '20px' : '30px',
                  padding: '5px',
                  color: index === 7 ? 'black' : 'blue',
                  fontWeight: 'bold',
                },
                readOnly: true,
              }}
            />
          ))}
          <Typography variant="body2" color="textSecondary">kg/월</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" marginTop={1}>
          자동차 CO₂ 발생량 (주행 거리 및 연료 효율에 따른 계산)
        </Typography>
      </Paper>

      {/* 폐기물 영역 */}
      <Paper elevation={3} sx={sectionStyle}>
        <Box display="flex" alignItems="center" marginBottom={2}>
          <DeleteIcon color="primary" />
          <Typography variant="h6" marginLeft={1}>
            폐기물 (Waste)
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <TextField
            label="폐기물 부피 (Waste Volume)"
            type="number"
            value={waste.liters}
            onChange={(e) => setWaste({ ...waste, liters: Number(e.target.value) })}
            variant="outlined"
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">L/월</InputAdornment>,
              inputProps: { min: 0, style: { MozAppearance: 'textfield'} },
            }}
            sx={{
              input: {
                '::-webkit-outer-spin-button': { display: 'none' }, 
                '::-webkit-inner-spin-button': { display: 'none' },
              },
            }}
          />
          <TextField
            label="폐기물 무게 (Waste Weight)"
            type="number"
            value={waste.kilograms}
            onChange={(e) => setWaste({ ...waste, kilograms: Number(e.target.value) })}
            variant="outlined"
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">kg/월</InputAdornment>,
              inputProps: { min: 0, style: { MozAppearance: 'textfield'} },
            }}
            sx={{
              input: {
                '::-webkit-outer-spin-button': { display: 'none' }, 
                '::-webkit-inner-spin-button': { display: 'none' },
              },
            }}
          />
        </Box>
        <Box display="flex" justifyContent="center" gap={1} marginTop={2}>
          {formattedWaste.map((digit, index) => (
            <TextField
              key={index}
              value={digit}
              disabled
              variant="outlined"
              inputProps={{
                style: {
                  textAlign: 'center',
                  width: index === 7 ? '20px' : '30px',
                  padding: '5px',
                  color: index === 7 ? 'black' : 'blue',
                  fontWeight: 'bold',
                },
                readOnly: true,
              }}
            />
          ))}
          <Typography variant="body2" color="textSecondary">kg/월</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" marginTop={1}>
          폐기물 CO₂ 발생량 (폐기물 부피 및 무게 * 0.5573)
        </Typography>
      </Paper>

      {/* 총 탄소 영역 */}
      <Paper elevation={3} sx={sectionStyle}>
        <Typography variant="h6" marginBottom={2}>
          총 탄소 발생량
        </Typography>
        <Box display="flex" justifyContent="center" gap={1} marginTop={2}>
          {formattedTotal.map((digit, index) => (
            <TextField
              key={index}
              value={digit}
              disabled
              variant="outlined"
              inputProps={{
                style: {
                  textAlign: 'center',
                  width: index === 7 ? '20px' : '30px',
                  padding: '5px',
                  color: index === 7 ? 'black' : 'green',
                  fontWeight: 'bold',
                },
                readOnly: true,
              }}
            />
          ))}
          <Typography variant="body2" color="textSecondary">kg/월</Typography>
        </Box>
      </Paper>

      {/* 계산버튼 */}
      <Button
        variant="contained"
        color="primary"
        onClick={calculateTotalFootprint}
        size="large"
        fullWidth
        sx={{ marginBottom: 2 }}
      >
        총 사용량 계산하기
      </Button>
    </Container>
  );
};

function App() {
  const [showOverlay, setShowOverlay] = useState(true);

  const handleCloseOverlay = () => {
    setShowOverlay(false);
  };

  return (
    <Router>
      <div>
        {showOverlay && <Overlay onClose={handleCloseOverlay} />}
        <nav className="menu">
          <ul>
            <li><Link to="/">메인</Link></li>
            <li><Link to="/emission">탄소 배출 현황</Link></li>
            <li><Link to="/calculator">탄소발자국 계산기</Link></li>
          </ul>
        </nav>
        <div className="content">
          <Routes>
            <Route exact path="/" element={<MainPage />} />
            <Route path="/emission" element={<CarbonEmission />} />
            <Route path="/calculator" element={<CarbonCalculator />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
