import { useState, useEffect, useCallback } from 'react';
import {
  AppBar, Toolbar, Typography, Container, Menu, MenuItem,
  IconButton, Avatar, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Button, Link, ListItemIcon,
  Box, Alert, CircularProgress, Tooltip
} from '@mui/material';
import { Logout, Login, Settings } from '@mui/icons-material';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// Constants
const API_BASE_URL = "https://fastapi-mionjoapi-alertemionjo1455-9k2qh0ff.leapcell.dev";
const SESSION_KEY = "sessionActive";

// Styles
const STYLES = {
  appBar: {
    width: '100%',
    backgroundColor: '#774904ff',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 2
  },
  title: {
    fontFamily: 'BBH Sans Hegarty, sans-serif',
    fontWeight: 700,
    letterSpacing: '.1rem',
    color: '#fff',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'none',
      color: '#fff',
    },
  },
  avatar: (isLoggedIn) => ({
    width: 40,
    height: 40,
    bgcolor: isLoggedIn ? '#F9AA33' : '#999',
    fontWeight: 'bold',
  }),
  menuPaper: {
    elevation: 0,
    sx: {
      overflow: 'visible',
      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
      mt: 1.5,
      minWidth: 200,
      '&::before': {
        content: '""',
        display: 'block',
        position: 'absolute',
        top: 0,
        right: 14,
        width: 10,
        height: 10,
        bgcolor: 'background.paper',
        transform: 'translateY(-50%) rotate(45deg)',
        zIndex: 0,
      },
    },
  },
  primaryButton: {
    bgcolor: '#344955',
    minWidth: 120,
    '&:hover': {
      bgcolor: '#2a3a44',
    }
  },
  forgotPasswordLink: {
    cursor: 'pointer',
    color: '#344955',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
    '&:disabled': {
      color: '#999',
      cursor: 'not-allowed',
    }
  }
};

// Utility Functions
const verifyPassword = (admins, password) => {
  return admins.some((admin) => admin.mdp === password);
};

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

function MenuBar({ onSend }) {
  // State management
  const [anchorEl, setAnchorEl] = useState(null);
  const [openLoginDialog, setOpenLoginDialog] = useState(false);
  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const open = Boolean(anchorEl);

  // Check session on mount
  useEffect(() => {
    const savedSession = sessionStorage.getItem(SESSION_KEY);
    if (savedSession === "true") {
      setIsLoggedIn(true);
      onSend?.(true);
    }
  }, [onSend]);

  // Menu handlers
  const handleMenuOpen = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Login dialog handlers
  const handleOpenLoginDialog = useCallback(() => {
    setOpenLoginDialog(true);
    setError('');
    handleMenuClose();
  }, [handleMenuClose]);

  const handleCloseLoginDialog = useCallback(() => {
    setOpenLoginDialog(false);
    setPassword('');
    setError('');
  }, []);

  // Email dialog handlers
  const handleOpenEmailDialog = useCallback(() => {
    setOpenEmailDialog(true);
    setError('');
    setNewEmail('');
    handleMenuClose();
  }, [handleMenuClose]);

  const handleCloseEmailDialog = useCallback(() => {
    setOpenEmailDialog(false);
    setNewEmail('');
    setError('');
  }, []);

  // Login handler
  const handleLogin = useCallback(async () => {
    if (!password) {
      setError('Veuillez entrer un mot de passe');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/`);
      const data = response.data;

      if (verifyPassword(data.admins, password)) {
        setIsLoggedIn(true);
        sessionStorage.setItem(SESSION_KEY, "true");
        onSend?.(true);
        handleCloseLoginDialog();
        
        toast.success('Connexion réussie ✅');
      } else {
        setError('Mot de passe incorrect');
        onSend?.(false);
        
        toast.error('Mot de passe incorrect');
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError('Erreur de connexion au serveur. Veuillez réessayer.');
      onSend?.(false);
      
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [password, onSend, handleCloseLoginDialog]);

  // Logout handler
  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    sessionStorage.removeItem(SESSION_KEY);
    setPassword('');
    onSend?.(false);
    handleMenuClose();
    
    toast.success('Déconnexion réussie');
  }, [onSend, handleMenuClose]);

  // Forgot password handler
  const handleForgotPassword = useCallback(async () => {
    if (loading) return;

    setLoading(true);

    try {
      await axios.get(`${API_BASE_URL}/admin/reinitialiser/`);
      
      toast.success('Un nouveau mot de passe a été envoyé aux administrateurs ✅');
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation:', error);
      
      toast.error('❌ Une erreur est survenue lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Add email handler
  const handleAddEmail = useCallback(async () => {
    // Validation
    if (!newEmail.trim()) {
      setError('Veuillez entrer une adresse email');
      toast.error('❌ Veuillez entrer une adresse email');
      return;
    }

    if (!validateEmail(newEmail)) {
      setError('Adresse email invalide');
      toast.error('❌ Adresse email invalide');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.get(`${API_BASE_URL}/admin_emails/ajouter/${newEmail}`);
      
      toast.success('Mail administrateur ajouté avec succès ✅');
      
      handleCloseEmailDialog();
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout:", error);
      
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.error || 
                       "Une erreur est survenue lors de l'ajout";
      
      setError(errorMsg);
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [newEmail, handleCloseEmailDialog]);

  // Key press handler
  const handleKeyPress = useCallback((event, action) => {
    if (event.key === 'Enter' && !loading) {
      action();
    }
  }, [loading]);

  return (
    <>
      <AppBar position="absolute" sx={STYLES.appBar}>
        <Container maxWidth="xl">
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#'}}>
            {/* Extrémité gauche : Logo + titre */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <img 
                src="/logo.svg" 
                alt="Logo de MIONJO" 
                width={60} 
                height={60}
              />
              <Typography
                variant="h5"
                noWrap
                component="a"
                sx={STYLES.title}
              >
                Système d'alerte des activités MIONJO
              </Typography>
            </Box>

            {/* Extrémité droite : Avatar */}
            <Tooltip title={isLoggedIn ? "Administrateur connecté" : "Connecter en tant qu'administrateur"}>
              <IconButton
                onClick={handleMenuOpen}
                size="small"
                aria-controls={open ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
              >
                <Avatar sx={STYLES.avatar(isLoggedIn)}>
                  {isLoggedIn ? 'A' : 'P'}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Toolbar>


          {/* Dropdown Menu */}
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={open}
            onClose={handleMenuClose}
            slotProps={{ paper: STYLES.menuPaper }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            {!isLoggedIn ? [
              <MenuItem key="login" onClick={handleOpenLoginDialog}>
                <ListItemIcon>
                  <Login fontSize="small" />
                </ListItemIcon>
                Se connecter
              </MenuItem>
            ] : [
              <MenuItem key="add-admin" onClick={handleOpenEmailDialog}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Nouvel administrateur
              </MenuItem>,
              <MenuItem key="logout" onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Se déconnecter
              </MenuItem>
            ]}
          </Menu>
        </Container>
      </AppBar>

      {/* Login Dialog */}
      <Dialog 
        open={openLoginDialog} 
        onClose={handleCloseLoginDialog} 
        maxWidth="sm"
        fullWidth
        keepMounted={false}
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', pb: 1 }}>
          Se connecter en tant qu'administrateur
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              autoFocus
              margin="dense"
              label="Mot de passe"
              type="password"
              fullWidth
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, handleLogin)}
              disabled={loading}
              error={Boolean(error)}
            />

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Link
                component="button"
                variant="body2"
                onClick={handleForgotPassword}
                disabled={loading}
                sx={STYLES.forgotPasswordLink}
              >
                Mot de passe oublié ?
              </Link>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseLoginDialog} 
            color="inherit"
            disabled={loading}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleLogin} 
            variant="contained" 
            disabled={!password || loading}
            sx={STYLES.primaryButton}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Se connecter'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Email Dialog */}
      <Dialog 
        open={openEmailDialog} 
        onClose={handleCloseEmailDialog} 
        maxWidth="sm"
        fullWidth
        keepMounted={false}
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', pb: 1 }}>
          Ajout de nouveau mail d'administrateur
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              autoFocus
              margin="dense"
              label="Nouveau mail"
              type="email"
              fullWidth
              variant="outlined"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, handleAddEmail)}
              disabled={loading}
              error={Boolean(error)}
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseEmailDialog} 
            color="inherit"
            disabled={loading}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleAddEmail} 
            variant="contained" 
            disabled={!newEmail || loading}
            sx={STYLES.primaryButton}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'AJOUTER'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default MenuBar;