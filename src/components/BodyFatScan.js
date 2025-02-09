import React, { useState, useCallback } from 'react';
import { Loader, Upload } from 'lucide-react';
import '../styles/scanner.css';

const metricRanges = {
  bodyFat: {
    ranges: {
      male: [
        { max: 5, level: 'Dangerously Low', color: '#ff4444', description: 'Essential fat only. This level is dangerously low and can lead to health problems.' },
        { max: 8, level: 'Very Lean', color: '#ffa726', description: 'Athletic level, commonly seen in elite athletes. Difficult to maintain.' },
        { max: 15, level: 'Fit', color: '#66bb6a', description: 'Optimal health range. Good muscle definition and athletic appearance.' },
        { max: 20, level: 'Acceptable', color: '#ffa726', description: 'Average range. Room for improvement but generally healthy.' },
        { max: 25, level: 'High', color: '#ff7043', description: 'Above average body fat. Consider lifestyle changes for better health.' },
        { max: 100, level: 'Very High', color: '#ff4444', description: 'Significantly elevated body fat. Health risks increased.' }
      ],
      female: [
        { max: 13, level: 'Dangerously Low', color: '#ff4444', description: 'Essential fat only. This level is dangerously low and can lead to health problems.' },
        { max: 16, level: 'Very Lean', color: '#ffa726', description: 'Athletic level, commonly seen in elite athletes. Difficult to maintain.' },
        { max: 23, level: 'Fit', color: '#66bb6a', description: 'Optimal health range. Good muscle definition and athletic appearance.' },
        { max: 28, level: 'Acceptable', color: '#ffa726', description: 'Average range. Room for improvement but generally healthy.' },
        { max: 33, level: 'High', color: '#ff7043', description: 'Above average body fat. Consider lifestyle changes for better health.' },
        { max: 100, level: 'Very High', color: '#ff4444', description: 'Significantly elevated body fat. Health risks increased.' }
      ]
    },
    scale: [0, 10, 20, 30, 40, 50]
  },
  bmi: {
    ranges: [
      { max: 18.5, level: 'Underweight', color: '#ff4444', description: 'BMI below healthy range. May indicate insufficient body mass.' },
      { max: 24.9, level: 'Normal', color: '#66bb6a', description: 'Healthy BMI range. Associated with optimal health outcomes.' },
      { max: 29.9, level: 'Overweight', color: '#ffa726', description: 'Elevated BMI. May increase risk of health issues.' },
      { max: 100, level: 'Obese', color: '#ff4444', description: 'Significantly elevated BMI. Associated with increased health risks.' }
    ],
    scale: [15, 20, 25, 30, 35, 40]
  },
  leanMassIndex: {
    ranges: [
      { max: 16, level: 'Low', color: '#ff4444', description: 'Low muscle mass. Consider resistance training and protein intake.' },
      { max: 19, level: 'Moderate', color: '#ffa726', description: 'Average muscle mass. Good foundation for further improvement.' },
      { max: 22, level: 'Good', color: '#66bb6a', description: 'Above average muscle mass. Indicates regular strength training.' },
      { max: 25, level: 'Excellent', color: '#43a047', description: 'High muscle mass. Typical of strength athletes.' },
      { max: 100, level: 'Very High', color: '#ffa726', description: 'Extremely high muscle mass. Common in professional bodybuilders.' }
    ],
    scale: [14, 17, 20, 23, 26, 29]
  }
};

const MetricScale = ({ value, type, gender }) => {
  const ranges = type === 'bodyFat' ? metricRanges[type].ranges[gender] : metricRanges[type].ranges;
  const scale = metricRanges[type].scale;
  
  const getCurrentRange = (value, ranges) => {
    const range = ranges.find(range => value <= range.max);
    return range || ranges[ranges.length - 1];
  };

  const currentRange = getCurrentRange(value, ranges);

  // New smooth gradient calculation
  const calculateGradient = () => {
    if (type === 'bmi') {
      // BMI specific gradient (red -> green -> orange -> red)
      return `linear-gradient(to right, 
        #ff4444 0%,
        #ff4444 15%,
        #66bb6a 22%,
        #66bb6a 27%,
        #ffa726 32%,
        #ff4444 40%
      )`;
    } else if (type === 'bodyFat') {
      // Body fat specific gradient
      return `linear-gradient(to right, 
        #ff4444 0%,
        #ffa726 15%,
        #66bb6a 25%,
        #66bb6a 35%,
        #ffa726 45%,
        #ff4444 55%
      )`;
    } else {
      // Lean mass index gradient
      return `linear-gradient(to right, 
        #ff4444 0%,
        #ffa726 20%,
        #66bb6a 40%,
        #43a047 60%,
        #ffa726 80%
      )`;
    }
  };

  const calculatePosition = (value, scale) => {
    // Find which segment the value falls into
    let leftIndex = 0;
    for (let i = 0; i < scale.length - 1; i++) {
      if (value >= scale[i] && value <= scale[i + 1]) {
        leftIndex = i;
        break;
      } else if (value < scale[0]) {
        // Before first mark
        return 0;
      } else if (value > scale[scale.length - 1]) {
        // After last mark
        return 100;
      }
    }
  
    // Calculate percentage within the segment
    const leftMark = scale[leftIndex];
    const rightMark = scale[leftIndex + 1];
    const segmentWidth = 100 / (scale.length - 1); // Width of each segment in percentage
    
    // Calculate position within the segment
    const segmentPosition = ((value - leftMark) / (rightMark - leftMark)) * segmentWidth;
    const basePosition = leftIndex * segmentWidth;
    
    return basePosition + segmentPosition;
  };

  return (
    <div className="MetricScaleContainer">
      <div className="ScaleBar">
        {scale.map((mark, index) => (
          <div key={index} className="ScaleMark">
            <div className="ScaleValue">{mark}</div>
          </div>
        ))}
      </div>
      <div 
        className="ColorBar"
        style={{ 
          background: calculateGradient()
        }}
      />
      <div 
        className="Indicator" 
        style={{ 
          left: `${calculatePosition(value, scale)}%` 
        }}
      />
      <div className="MetricInfo">
        <div className="MetricLevel" style={{ color: currentRange.color }}>
          {currentRange.level}
        </div>
        <div className="MetricDescription">{currentRange.description}</div>
      </div>
    </div>
  );
};

const BodyMetricsScanner = () => {
  const [formData, setFormData] = useState({
    height: '',
    weight: '',
    age: '',
    gender: ''
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    if (!formData.height) errors.height = 'Height is required';
    if (!formData.weight) errors.weight = 'Weight is required';
    if (!formData.age) errors.age = 'Age is required';
    if (!formData.gender) errors.gender = 'Gender is required';
    if (!image) errors.image = 'Image is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateBMI = () => {
    const heightInMeters = (formData.height * 0.0254);  // Convert inches to meters (1 inch = 0.0254 meters)
    const weightInKg = formData.weight * 0.453592;      // Convert lbs to kg (1 lb = 0.453592 kg)
    return (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
};

const calculateLeanMassIndex = (bodyFatPercentage) => {
  const weightInKg = formData.weight * 0.453592;      // Convert lbs to kg
  const fatMass = (weightInKg * bodyFatPercentage) / 100;
  const leanMass = weightInKg - fatMass;
  const heightInMeters = formData.height * 0.0254;    // Convert inches to meters
  return (leanMass / (heightInMeters * heightInMeters)).toFixed(1);
};

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  }, []);

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsScanning(true);
    setError(null);
    setResults(null);

    try {
      const base64Image = await convertToBase64(image);
      const response = await fetch('https://lpgadqrtfstdmnycppkx.supabase.co/functions/v1/callBodyFatAssess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZ2FkcXJ0ZnN0ZG1ueWNwcGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4ODI1ODcsImV4cCI6MjA1MTQ1ODU4N30.wwbgQN_zGHvUxRRc01m2j0bIHCSi7qoDc4T2d-MLfV4',
        },
        body: JSON.stringify({
          image: base64Image,
          metrics: {
            height: parseFloat(formData.height),
            weight: parseFloat(formData.weight),
            age: parseInt(formData.age),
            gender: formData.gender
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();
      const bodyFatPercentage = parseFloat(data.bodyFatPercentage);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResults({
        bodyFatPercentage,
        bmi: calculateBMI(),
        leanMassIndex: calculateLeanMassIndex(bodyFatPercentage)
      });
    } catch (err) {
      setError(err.message || 'Failed to analyze image. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="Container">
      <h1 className="Title">Body Composition Scanner</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="FormGrid">
          <div className="FormField">
            <label className="FormLabel">Height (in)</label>
            <input
              className="FormInput"
              type="number"
              name="height"
              value={formData.height}
              onChange={handleInputChange}
              placeholder="Height in in"
            />
            {formErrors.height && <p className="ErrorText">{formErrors.height}</p>}
          </div>
          
          <div className="FormField">
            <label className="FormLabel">Weight (lbs)</label>
            <input
              className="FormInput"
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              placeholder="Weight in lbs"
            />
            {formErrors.weight && <p className="ErrorText">{formErrors.weight}</p>}
          </div>
          
          <div className="FormField">
            <label className="FormLabel">Age</label>
            <input
              className="FormInput"
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="Age"
            />
            {formErrors.age && <p className="ErrorText">{formErrors.age}</p>}
          </div>
          
          <div className="FormField">
            <label className="FormLabel">Gender</label>
            <select
              className="FormSelect"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {formErrors.gender && <p className="ErrorText">{formErrors.gender}</p>}
          </div>
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
          id="imageInput"
        />
        
        {!preview && (
          <div className="UploadContainer">
            <label className="UploadArea" htmlFor="imageInput">
              <Upload className="UploadIcon" size={32} />
              <p className="UploadText">Click or drag to upload your photo</p>
              <p className="UploadSubText">
                For best results, use a clear, well-lit photo
              </p>
            </label>
            {formErrors.image && <p className="ErrorText">{formErrors.image}</p>}
          </div>
        )}

        {preview && (
          <div className="ImagePreview">
            <img 
              src={preview} 
              alt="Preview" 
              className={`PreviewImage ${isScanning ? 'isScanning' : ''}`}
            />
            <div className={`ScanLine ${isScanning ? 'isScanning' : ''}`} />
          </div>
        )}

        {isScanning && (
          <div className="LoadingSpinner">
            <Loader size={32} color="#666" />
          </div>
        )}

        {!isScanning && preview && (
          <button className="SubmitButton" type="submit" disabled={isScanning}>
            Analyze
          </button>
        )}
      </form>

      {error && <div className="ErrorMessage">{error}</div>}

      {results && (
        <div className="Result">
          <h2 className="ResultTitle">Analysis Results</h2>
          
          <div className="ResultSection">
            <h3>Body Fat Percentage: {results.bodyFatPercentage}%</h3>
            <MetricScale 
              value={results.bodyFatPercentage} 
              type="bodyFat"
              gender={formData.gender}
            />
          </div>

          <div className="ResultSection">
            <h3>BMI: {results.bmi}</h3>
            <MetricScale 
              value={results.bmi} 
              type="bmi"
            />
          </div>

          <div className="ResultSection">
            <h3>Lean Mass Index: {results.leanMassIndex}</h3>
            <MetricScale 
              value={results.leanMassIndex} 
              type="leanMassIndex"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyMetricsScanner;