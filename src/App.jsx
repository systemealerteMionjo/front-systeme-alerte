import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Grid from '@mui/material/Grid';
import MenuBar from './menu.jsx';
import AddActivityDialog from './addDialog.jsx';
import axios from 'axios';
import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Chip, Tabs, Tab, TextField, Box, Badge, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { styled, lighten } from '@mui/material/styles';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditActivityDialog from './EditDialog.jsx';
import dayjs from 'dayjs';
import DeleteDialog from './deleteDialog.jsx';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from './supabase';

// ------------------ Components Memo ------------------
const StatusChip = memo(({ label, color }) => <Chip label={label} color={color} size="small" />);

const API_BASE_URL = "https://fastapi-mionjoapi-alertemionjo1455-9k2qh0ff.leapcell.dev";

const FileDownloadButton = memo(({ fileUrl }) => {
  const handleDownload = useCallback(() => {
    if (!fileUrl) return;

    try {
      window.open(fileUrl, '_blank');
      toast.success("Ouverture du fichier");
    } catch (err) {
      console.error("Erreur lors de l'ouverture:", err);
      toast.error("Erreur lors de l'ouverture du fichier.");
    }
  }, [fileUrl]);

  if (!fileUrl) return null;

  return (
    <Tooltip title="Télécharger le rapport">
      <IconButton onClick={handleDownload} size="small">
        <DownloadForOfflineIcon color="success" />
      </IconButton>
    </Tooltip>
  );
});

// ------------------ Upload Supabase ------------------
const FileUploadButton = memo(({ rowId, rowData, onUpload }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  const handleButtonClick = () => setOpenDialog(true);
  const handleCloseDialog = () => {
    if (!loading) {
      setOpenDialog(false);
      setFile(null);
    }
  };

  const handleSupabaseUpload = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    // ⛔ supprime l'ancien fichier si existe
    if (rowData?.fichierUrl) {
      try {
        const oldUrl = rowData.fichierUrl;
        const filePath = oldUrl.split("/").pop(); // récupère le nom du fichier
        console.log("Suppression du fichier existant:", filePath);

        const { error: deleteError } = await supabase.storage
          .from("mionjo_files")
          .remove([filePath]);

        if (deleteError) {
          console.error("Erreur suppression ancienne pièce:", deleteError);
          toast.error("Impossible de supprimer l'ancien fichier");
        } else {
          console.log("Ancien fichier supprimé ✅");
        }
      } catch (err) {
        console.error("Erreur lors de l'extraction/suppression:", err);
      }
    }

    // Validation de la taille du fichier (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 100MB)");
      return;
    }

    try {
      setLoading(true);
      toast.loading("Upload en cours...", { id: 'upload' });

      // Générer un nom de fichier unique
      const fileExtension = file.name.split('.').pop();
      const fileName = `rapport_${rowId}_${Date.now()}.${fileExtension}`;
      
      console.log('Upload vers Supabase:', fileName);

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mionjo_files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false // Ne pas écraser les fichiers existants
        });

      if (uploadError) {
        console.error('Erreur Supabase upload:', uploadError);
        throw new Error(`Erreur upload: ${uploadError.message}`);
      }

      console.log('Upload réussi:', uploadData);

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('mionjo_files')
        .getPublicUrl(fileName);

      console.log('URL publique:', publicUrl);

      if (!publicUrl) {
        throw new Error("Impossible de générer l'URL publique");
      }

      // Mettre à jour la base de données via l'API
      try {
        const formData = new FormData();
        formData.append('lien_fichier', publicUrl); // ⚠️ Le nom DOIT correspondre exactement
        formData.append('fichier_nom', file.name);  // ⚠️ Ajout du nom du fichier
        const response = await axios.post(
          `${API_BASE_URL}/fichier/${rowId}/upload`,
         formData
        );
        console.log(response.data);

        if (response.status === 200) {
          toast.success("Fichier importé avec succès", { id: 'upload' });
          if (onUpload) onUpload();
          setOpenDialog(false);
          setFile(null);
        }
      } catch (error) {
        throw new Error("Échec de l'enregistrement dans la base de données");
      } 
    } catch (err) {
      console.error("Erreur complète:", err);
      
      // Messages d'erreur plus spécifiques
      let errorMessage = "Erreur lors de l'upload";
      if (err.message.includes('storage')) {
        errorMessage = "Erreur de stockage. Vérifiez la configuration Supabase.";
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorMessage = "Erreur de connexion. Vérifiez votre internet.";
      } else {
        errorMessage = err.message;
      }
      
      toast.error(`Erreur: ${errorMessage}`, { id: 'upload' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="Importer le rapport">
        <IconButton size="small" onClick={handleButtonClick}>
          <CloudUploadIcon />
        </IconButton>
      </Tooltip>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Importer un fichier</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              style={{ marginBottom: '16px', display: 'block', width: '100%' }}
              disabled={loading}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.zip"
            />
            
            {file && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <strong>Fichier sélectionné :</strong> {file.name}
                <br />
                <small>Taille: {(file.size / 1024 / 1024).toFixed(2)} MB</small>
                <br />
              </Box>
            )}

            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#1565c0' }}>
                <br />
                Taille maximale: 100MB
              </p>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleSupabaseUpload}
            variant="contained"
            color="success"
            startIcon={loading ? null : <CloudUploadIcon />}
            disabled={!file || loading}
          >
            {loading ? 'Upload en cours...' : 'Importer'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

// ------------------ Styled DataGrid ------------------
const StyledDataGrid = styled(DataGrid)(({ theme }) => {
  const successColor = theme.palette.success.main;
  const errorColor = theme.palette.error.main;
  const primaryColor = theme.palette.primary.main;

  const getBackground = (color) => ({
    backgroundColor: lighten(color, 0.9),
    '&:hover': { backgroundColor: lighten(color, 0.85) },
  });

  return {
    width: '100%',
    flex: 1,
    '& .super-app--termine': getBackground(successColor),
    '& .super-app--en_retard': getBackground(errorColor),
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: lighten(primaryColor, 0.85),
      fontWeight: 600,
      position: 'sticky',
      top: 0,
      zIndex: 2,
    },
  };
});

// ------------------ Main App ------------------
function App() {
  const [rows, setRows] = useState([]);
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const adminPriv = (value) => setIsLoggedIn(value);

  const handleRowClick = (params) => setSelected(params.row); 

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/list0`);
      if (!Array.isArray(data)) return;
      
      const transformed = data.map((r) => {
        const dateLimite = new Date(r.datelimite);
        const today = new Date();
        let effectiveStatut = r.statut.toLowerCase();
        let retard = 0;

        if (effectiveStatut === 'en cours' && dateLimite < today) {
          effectiveStatut = 'en_retard';
          const diffTime = today - dateLimite;
          retard = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          id: r.id_inf,
          raison: r.raison,
          mail: r.mail_resp,
          datelimite: dayjs(r.datelimite).format("DD-MM-YYYY HH:mm"),
          datelivraison: r.date_upload != null ? dayjs(r.date_upload).format("DD-MM-YYYY HH:mm") : '-',
          observation: r.observation || '-',
          statut: r.statut,
          effectiveStatut,
          nom: r.nom_resp,
          fichierUrl: r.lien_fichier,
          nom_fichier: r.fichier_nom,
          retard,
        };
      });
      setRows(transformed);
    } catch (err) {
      console.error(err);
      toast.error("Une erreur est survenue lors du chargement de la liste.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  useEffect(() => {
    const savedUser = sessionStorage.getItem("sessionActive");
    if (savedUser) setIsLoggedIn(true);
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (value === 1) return r.effectiveStatut === 'en cours';
      if (value === 2) return r.effectiveStatut === 'termine';
      if (value === 3) return r.effectiveStatut === 'en_retard';
      return true;
    });
  }, [rows, value]);

  const displayedRows = useMemo(() => {
    if (!searchTerm) return filteredRows;
    return filteredRows.filter((r) => 
      r.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.raison.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [filteredRows, searchTerm]);

  const columnsAdmin = useMemo(() => [
    { field: 'id', headerName: 'ID', flex: 0.5 },
    {
      field: 'edit', 
      headerName: '', 
      flex: 0.3,
      renderCell: (params) => (
        <EditActivityDialog refreshRows={fetchData} rowData={params.row} />
      )
    },
    {
      field: 'supprimer', 
      headerName: '', 
      flex: 0.3,
      renderCell: (params) => (
        <DeleteDialog refreshRows={fetchData} rowData={params.row} />
      )
    },
    {
      field: 'statut',
      headerName: 'Status',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        let label = params.row.statut;
        let color = 'default';
        switch (params.row.effectiveStatut) {
          case 'termine': 
            label = 'Terminé'; 
            color = 'success'; 
            break;
          case 'en cours': 
            label = 'En cours'; 
            color = 'primary'; 
            break;
          case 'en_retard': 
            label = 'En retard'; 
            color = 'error'; 
            break;
          default:
            label = params.row.statut;
            color = 'default';
        }
        return <StatusChip label={label} color={color} />;
      }
    },
    { field: 'nom', headerName: 'Responsables', flex: 1.5 },
    { field: 'raison', headerName: 'Activités', flex: 1.5 },
    { field: 'datelimite', headerName: 'Deadline', flex: 1 },
    { field: 'datelivraison', headerName: 'Date de livraison', flex: 1 },
    {
      field: 'retard',
      headerName: 'Retard (jours)',
      flex: 0.7,
      minWidth: 120,
      renderCell: (params) => 
        params.row.retard > 0 ? (
          <Chip label={`${params.row.retard}j`} color="error" size="small" />
        ) : (
          <Chip label="0" size="small" />
        )
    },
    { field: 'observation', headerName: 'Observation', flex: 1 },
    { 
      field: 'fichier', 
      headerName: 'Rapport', 
      flex: 0.5, 
      renderCell: (params) => <FileDownloadButton fileUrl={params.row.fichierUrl} /> 
    },
    { 
      field: 'upload', 
      headerName: '', 
      flex: 0.5, 
      renderCell: (params) => <FileUploadButton rowId={params.row.id} rowData={params.row} onUpload={fetchData} /> 
    }
  ], [fetchData]);

  // Pour les utilisateurs non connectés, on retire les colonnes edit/supprimer
  const columnsUser = useMemo(() => 
    columnsAdmin.filter(col => 
      col.field !== 'edit' && col.field !== 'supprimer'
    ), [columnsAdmin]
  );

  return (
    <>
      <Toaster 
        position="bottom-left" 
        toastOptions={{
          success: { duration: 3000 },
          error: { duration: 4000 },
          style: { 
            padding: '12px 16px', 
            borderRadius: '8px', 
            fontSize: '0.9rem' 
          }
        }} 
      />

      <Grid container sx={{ width: '100vw', height: '100vh', flexDirection: 'column' }}>
        <Grid item xs={12}>
          <MenuBar onSend={adminPriv}/>
        </Grid>

        <Grid item xs={12} sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          px: 2, 
          py: 1, 
          backgroundColor: '#fff', 
          zIndex: 1000, 
          mt: 8,
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Tabs 
            value={value} 
            onChange={(e, v) => { 
              setValue(v); 
              setSearchTerm(''); 
            }}
            sx={{ maxWidth: '100%' }}
          >
            <Tab label={<Badge color="default" badgeContent={rows.length}>Tous</Badge>} />
            <Tab label={<Badge color="primary" badgeContent={rows.filter(r => r.effectiveStatut === 'en cours').length}>En cours</Badge>} />
            <Tab label={<Badge color="success" badgeContent={rows.filter(r => r.effectiveStatut === 'termine').length}>Terminés</Badge>} />
            <Tab label={<Badge color="error" badgeContent={rows.filter(r => r.effectiveStatut === 'en_retard').length}>En retard</Badge>} />
          </Tabs>
          
          <TextField 
            placeholder="Rechercher..." 
            size="small" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
        </Grid>

        <Grid item xs={12} sx={{ flex: 1, minHeight: 0 }}>
          <StyledDataGrid
            rows={displayedRows}
            columns={isLoggedIn ? columnsAdmin : columnsUser}
            loading={loading}
            onRowClick={handleRowClick}
            getRowId={(r) => r.id}
            getRowClassName={(params) => `super-app--${params.row.effectiveStatut}`}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } }
            }}
          />
        </Grid>

        <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
          <AddActivityDialog refreshRows={fetchData} row={rows} />
        </Box>
      </Grid>
    </>
  );
}

export default App;