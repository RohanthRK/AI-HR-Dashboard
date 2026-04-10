import React, { useState } from 'react';
import { Container, Alert } from 'react-bootstrap';
import TeamSelector from './TeamSelector';
import TeamReview from './TeamReview';
import axios from 'axios';

const TeamReviewContainer = () => {
  const [currentStep, setCurrentStep] = useState('select'); // 'select', 'review', 'success', 'error'
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [submitStatus, setSubmitStatus] = useState({
    message: '',
    type: ''
  });

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setCurrentStep('review');
  };

  const handleBack = () => {
    setCurrentStep('select');
  };

  const handleSubmitReview = async (reviewData) => {
    try {
      setSubmitStatus({ message: 'Submitting review...', type: 'info' });
      
      // Combine team data with review data
      const reviewPayload = {
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        ...reviewData
      };

      // Replace with your actual API endpoint
      await axios.post('/api/team-reviews/', reviewPayload);
      
      setSubmitStatus({
        message: 'Team review submitted successfully!',
        type: 'success'
      });
      
      setCurrentStep('success');
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmitStatus({
        message: 'Failed to submit review. Please try again.',
        type: 'danger'
      });
      setCurrentStep('error');
    }
  };

  const handleReset = () => {
    setSelectedTeam(null);
    setSubmitStatus({ message: '', type: '' });
    setCurrentStep('select');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'select':
        return <TeamSelector onSelectTeam={handleTeamSelect} />;
        
      case 'review':
        return (
          <TeamReview 
            team={selectedTeam} 
            onSubmit={handleSubmitReview} 
            onBack={handleBack}
          />
        );
        
      case 'success':
        return (
          <div className="text-center py-5">
            <Alert variant="success">
              <Alert.Heading>Review Submitted!</Alert.Heading>
              <p>Your review for {selectedTeam.name} has been successfully recorded.</p>
              <hr />
              <div className="d-flex justify-content-end">
                <button 
                  className="btn btn-outline-success" 
                  onClick={handleReset}
                >
                  Submit Another Review
                </button>
              </div>
            </Alert>
          </div>
        );
        
      case 'error':
        return (
          <div className="py-5">
            <Alert variant="danger">
              <Alert.Heading>Submission Error</Alert.Heading>
              <p>{submitStatus.message}</p>
              <hr />
              <div className="d-flex justify-content-end">
                <button 
                  className="btn btn-outline-danger me-2" 
                  onClick={() => setCurrentStep('review')}
                >
                  Try Again
                </button>
                <button 
                  className="btn btn-outline-secondary" 
                  onClick={handleReset}
                >
                  Start Over
                </button>
              </div>
            </Alert>
          </div>
        );
        
      default:
        return <TeamSelector onSelectTeam={handleTeamSelect} />;
    }
  };

  return (
    <Container className="py-4">
      <h4 className="mb-4 border-bottom pb-2">Team Performance Review</h4>
      {renderStep()}
    </Container>
  );
};

export default TeamReviewContainer; 