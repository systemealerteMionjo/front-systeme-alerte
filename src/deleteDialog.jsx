import { useState, forwardRef, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Grow, IconButton, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = "https://fastapi-mionjoapi-alertemionjo1455-9k2qh0ff.leapcell.dev";

// Styles constants
const STYLES = {
  iconButton: {
    color: '#000',
    '&:focus': { outline: 'none' },
    '&.Mui-focusVisible': { outline: 'none' }
  },
  primaryButton: {
    backgroundColor: '#f9aa33',
    color: '#000',
    borderRadius: 2,
    px: 3,
    '&:hover': { backgroundColor: '#e89922' },
    '&:disabled': {
      backgroundColor: '#f9aa3380',
      color: '#00000060'
    }
  },
  secondaryButton: {
    backgroundColor: '#e8f0f6',
    color: '#000',
    borderRadius: 2,
    px: 3,
    '&:hover': { backgroundColor: '#d0e0f0' }
  }
};

// Transition component
const Transition = forwardRef(function Transition(props, ref) {
  return <Grow ref={ref} {...props} />;
});

export default function DeleteDialog({ refreshRows, rowData }) {
  // State management
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [id, setId] = useState(null);

  // Update ID when dialog opens
  useEffect(() => {
    if (open && rowData) {
      setId(rowData.id);
    }
  }, [open, rowData]);

  // Handlers
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!id) {
      toast.error("ID invalide");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/supprimer_information/${id}`
      );
      
      console.log("✅ Suppression réussie: ", response.data);
      
      toast.success("Suppression réussie ✅");

      handleClose();

      // Refresh parent component data
      if (refreshRows) {
        await refreshRows();
      }

    } catch (error) {
      console.error(
        "❌ Erreur lors de la suppression:", 
        error.response?.data || error.message
      );
      
      const errorMsg = 
        error.response?.data?.detail || 
        error.response?.data?.error || 
        "Erreur lors de la suppression";
      
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="Supprimer">
        <IconButton
          size="small"
          onClick={handleClickOpen}
          sx={STYLES.iconButton}
          aria-label="Supprimer l'activité"
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="sm"
        keepMounted={false}
        TransitionProps={{
          timeout: 300
        }}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Supprimer cette ligne N° {rowData?.id}
        </DialogTitle>

        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Activité: {rowData?.raison}
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            sx={STYLES.secondaryButton}
          >
            Annuler
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={loading}
            sx={STYLES.primaryButton}
          >
            {loading ? "Suppression..." : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}