import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Loader, Upload } from 'lucide-react';

const Container = styled.div`
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  color: #333;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 24px;
`;

const UploadContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const UploadArea = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 200px;
  border: 2px dashed #666;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #ffffff;
  
  &:hover {
    border-color: #333;
    background-color: #f8f8f8;
  }
`;

const UploadIcon = styled(Upload)`
  margin-bottom: 1rem;
  color: #666;
`;

const UploadText = styled.p`
  margin: 0;
  color: #333;
  font-size: 16px;
`;

const UploadSubText = styled.p`
  margin: 8px 0 0 0;
  color: #666;
  font-size: 12px;
`;

const ImagePreview = styled.div`
  position: relative;
  max-width: 400px;
  margin: 2rem auto;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const PreviewImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
  ${props => props.isScanning && `
    filter: grayscale(50%) brightness(120%);
    animation: scan 2s infinite linear;
  `}

  @keyframes scan {
    0% {
      filter: grayscale(50%) brightness(120%);
    }
    50% {
      filter: grayscale(0%) brightness(100%);
    }
    100% {
      filter: grayscale(50%) brightness(120%);
    }
  }
`;

const ScanLine = styled.div`
  display: ${props => props.isScanning ? 'block' : 'none'};
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, transparent, #00ff00, transparent);
  animation: scanLine 2s infinite linear;
  
  @keyframes scanLine {
    0% {
      top: 0;
    }
    100% {
      top: 100%;
    }
  }
`;

const Result = styled.div`
  text-align: center;
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f8f8f8;
  border-radius: 8px;
  font-size: 18px;
  color: #333;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 2rem 0;
  
  svg {
    animation: rotate 2s linear infinite;
  }
  
  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  text-align: center;
  margin-top: 1rem;
`;

const BodyFatScanner = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      analyzePicture(file);
    }
  }, []);

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const analyzePicture = async (file) => {
    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      const base64Image = await convertToBase64(file);

      const response = await fetch('https://lpgadqrtfstdmnycppkx.supabase.co/functions/v1/callBodyFatAssess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZ2FkcXJ0ZnN0ZG1ueWNwcGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4ODI1ODcsImV4cCI6MjA1MTQ1ODU4N30.wwbgQN_zGHvUxRRc01m2j0bIHCSi7qoDc4T2d-MLfV4`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          image: base64Image
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze image');
      }

      const data = await response.json();
      const percentage = extractPercentage(data.message);
      
      // Simulate a delay for the scanning effect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResult(percentage);
      console.log(data.message)
    } catch (err) {
      console.error('Error details:', err);
      setError(err.message || 'Failed to analyze image. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const extractPercentage = (content) => {
    // Extract the first number from the response
    const match = content.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };

  return (
    <Container>
      <Title>Body Fat Percentage Scanner</Title>
      
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
        id="imageInput"
      />
      
      {!preview && (
        <UploadContainer>
          <UploadArea htmlFor="imageInput">
            <UploadIcon size={32} />
            <UploadText>Click or drag to upload your photo</UploadText>
            <UploadSubText>
              For best results, use a clear, well-lit photo
            </UploadSubText>
          </UploadArea>
        </UploadContainer>
      )}

      {preview && (
        <ImagePreview>
          <PreviewImage src={preview} alt="Preview" isScanning={isScanning} />
          <ScanLine isScanning={isScanning} />
        </ImagePreview>
      )}

      {isScanning && (
        <LoadingSpinner>
          <Loader size={32} color="#666" />
        </LoadingSpinner>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {result !== null && (
        <Result>
          Your estimated body fat percentage is {result}%
        </Result>
      )}
    </Container>
  );
};

export default BodyFatScanner;